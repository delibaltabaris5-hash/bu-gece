import type { User } from '@supabase/supabase-js';

import { isMatchMood, type MatchMood } from '@/lib/matchMoods';
import { FREE_MESSAGE_QUOTA } from '@/lib/quota';
import { deleteSecureValue, readSecureValue, writeSecureValue } from '@/lib/secureKv';
import { getSupabase } from '@/lib/supabaseClient';

const SESSION_KEY = 'bugece.session-uid';
const LEGACY_BOOK_KEY = 'bugece.accounts';
const LEGACY_SESSION_KEY = 'bugece.session-account';

export type MemberAccount = {
  accountId: string;
  email: string;
  displayName: string;
  passwordHash: string;
  provider?: 'password' | 'google';
  freeMessagesRemaining: number;
  isPro: boolean;
  mood?: MatchMood | null;
};

export type AccountBook = {
  v: 1;
  accounts: Record<string, MemberAccount>;
};

export type AuthResult =
  | { ok: true; account: MemberAccount }
  | { ok: false; message: string };

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function authErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : '';
  const lower = message.toLowerCase();
  if (lower.includes('already') || lower.includes('registered')) return 'Bu e-posta zaten kayıtlı. Giriş yap.';
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) return 'E-posta veya şifre uyuşmadı.';
  if (lower.includes('email')) return 'Geçerli bir e-posta yaz.';
  if (lower.includes('password')) return 'Şifre en az 6 karakter olsun.';
  if (!getSupabase()) return 'Supabase hazır değil.';
  return fallback;
}

function accountFromProfile(row: Record<string, unknown>, emailFallback: string): MemberAccount {
  const mood = typeof row.mood === 'string' && isMatchMood(row.mood) ? row.mood : null;
  return {
    accountId: String(row.id ?? ''),
    email: typeof row.email === 'string' ? row.email : emailFallback,
    displayName: typeof row.name === 'string' ? row.name : '',
    passwordHash: '',
    provider: row.provider === 'google' ? 'google' : 'password',
    freeMessagesRemaining: typeof row.free_messages_remaining === 'number' ? row.free_messages_remaining : FREE_MESSAGE_QUOTA,
    isPro: row.is_pro === true,
    mood,
  };
}

async function upsertProfile(account: MemberAccount): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase hazır değil.');
  const { error } = await supabase.from('profiles').upsert({
    id: account.accountId,
    email: account.email,
    name: account.displayName,
    mood: account.mood ?? null,
    mood_updated_at: account.mood ? new Date().toISOString() : null,
    free_messages_remaining: account.freeMessagesRemaining,
    is_pro: account.isPro,
    provider: account.provider ?? 'password',
    match_status: 'idle',
  });
  if (error) throw error;
}

export async function listRegisteredUsers(): Promise<MemberAccount[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from('profiles').select('*').order('email');
  if (error || !data) return [];
  return data.map((row) => accountFromProfile(row as Record<string, unknown>, ''));
}

export async function clearLegacyLocalAccounts(): Promise<void> {
  await deleteSecureValue(LEGACY_BOOK_KEY);
  await deleteSecureValue(LEGACY_SESSION_KEY);
}

export async function readSessionAccountId(): Promise<string | null> {
  await clearLegacyLocalAccounts();
  const stored = await readSecureValue(SESSION_KEY);
  if (stored.ok && stored.value) return stored.value;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Session only. Null signs out and does not delete the profile. */
export async function writeSessionAccountId(accountId: string | null): Promise<void> {
  await clearLegacyLocalAccounts();
  if (!accountId) {
    await deleteSecureValue(SESSION_KEY);
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut().catch(() => undefined);
    return;
  }
  await writeSecureValue(SESSION_KEY, accountId);
}

export async function loadAccountByUid(uid: string): Promise<MemberAccount | null> {
  const supabase = getSupabase();
  if (!supabase || !uid) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error || !data) return null;
  return accountFromProfile(data as Record<string, unknown>, '');
}

function validateCredentials(emailInput: string, password: string): { email: string } | AuthResult {
  const email = normalizeEmail(emailInput);
  if (!email) return { ok: false, message: 'Geçerli bir e-posta yaz.' };
  if (password.trim().length < 6) return { ok: false, message: 'Şifre en az 6 karakter olsun.' };
  return { email };
}

async function profileForUser(user: User, displayName: string, provider: 'password' | 'google'): Promise<MemberAccount> {
  const existing = await loadAccountByUid(user.id);
  if (existing) return existing;
  const account: MemberAccount = {
    accountId: user.id,
    email: user.email ?? '',
    displayName: displayName.trim().slice(0, 32),
    passwordHash: '',
    provider,
    freeMessagesRemaining: FREE_MESSAGE_QUOTA,
    isPro: false,
  };
  await upsertProfile(account);
  return account;
}

export async function signInWithPassword(emailInput: string, password: string): Promise<AuthResult> {
  const checked = validateCredentials(emailInput, password);
  if ('ok' in checked) return checked;
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase hazır değil.' };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: checked.email, password });
    if (error || !data.user) return { ok: false, message: authErrorMessage(error, 'Giriş yapılamadı. Tekrar dene.') };
    const account = await profileForUser(data.user, '', 'password');
    await writeSessionAccountId(data.user.id);
    return { ok: true, account };
  } catch (error) {
    return { ok: false, message: authErrorMessage(error, 'Giriş yapılamadı. Tekrar dene.') };
  }
}

/** Creates the auth user and the profile row together. */
export async function registerAccount(
  emailInput: string,
  password: string,
  displayNameInput = '',
  moodInput = '',
): Promise<AuthResult> {
  const checked = validateCredentials(emailInput, password);
  if ('ok' in checked) return checked;
  if (!isMatchMood(moodInput)) return { ok: false, message: 'Bir ruh hali seç.' };
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase hazır değil.' };
  try {
    const { data, error } = await supabase.auth.signUp({ email: checked.email, password });
    if (error || !data.user) return { ok: false, message: authErrorMessage(error, 'Hesap kaydedilemedi. Tekrar dene.') };
    if (!data.session) {
      return { ok: false, message: 'Supabase e-posta onayı açık. Onayı kapatıp tekrar dene.' };
    }
    const account: MemberAccount = {
      accountId: data.user.id,
      email: checked.email,
      displayName: displayNameInput.trim().slice(0, 32),
      passwordHash: '',
      provider: 'password',
      freeMessagesRemaining: FREE_MESSAGE_QUOTA,
      isPro: false,
      mood: moodInput,
    };
    await upsertProfile(account);
    await writeSessionAccountId(data.user.id);
    return { ok: true, account };
  } catch (error) {
    return { ok: false, message: authErrorMessage(error, 'Hesap kaydedilemedi. Tekrar dene.') };
  }
}

export async function signInWithGoogle(
  emailInput: string,
  displayNameInput = '',
  idToken = '',
): Promise<AuthResult> {
  const email = normalizeEmail(emailInput);
  if (!email) return { ok: false, message: 'Google hesabından e-posta alınamadı.' };
  if (!idToken) return { ok: false, message: 'Google oturumu doğrulanamadı. E-posta ile kayıt ol.' };
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase hazır değil.' };
  try {
    let user: User | null = null;
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (!error && data.user) {
      user = data.user;
    } else {
      // Supabase panelinde Google provider devre dışıysa fallback:
      // Google tarafından doğrulanmış e-posta ile profiles tablosunda hesap oluştur/bul
      const { data: existingRows } = await supabase.from('profiles').select('*').eq('email', email).limit(1);
      if (existingRows && existingRows.length > 0) {
        const row = existingRows[0] as Record<string, unknown>;
        const account = accountFromProfile(row, email);
        if (displayNameInput && !account.displayName) {
          account.displayName = displayNameInput.trim().slice(0, 32);
          await upsertProfile(account);
        }
        await writeSessionAccountId(account.accountId);
        return { ok: true, account };
      }
      // Yeni profil oluştur (deterministik id: google_{sub/email hash})
      const fallbackUid = `google_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const newAccount: MemberAccount = {
        accountId: fallbackUid,
        email,
        displayName: displayNameInput.trim().slice(0, 32),
        passwordHash: '',
        provider: 'google',
        freeMessagesRemaining: FREE_MESSAGE_QUOTA,
        isPro: false,
      };
      await upsertProfile(newAccount);
      await writeSessionAccountId(fallbackUid);
      return { ok: true, account: newAccount };
    }
    const account = await profileForUser(user, displayNameInput, 'google');
    await writeSessionAccountId(user.id);
    return { ok: true, account };
  } catch (error) {
    return { ok: false, message: authErrorMessage(error, 'Google ile giriş yapılamadı.') };
  }
}

export async function saveAccountQuota(
  accountId: string,
  quota: { freeMessagesRemaining: number; isPro: boolean },
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !accountId) return;
  await supabase
    .from('profiles')
    .update({ free_messages_remaining: quota.freeMessagesRemaining, is_pro: quota.isPro })
    .eq('id', accountId);
}
