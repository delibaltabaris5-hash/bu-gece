import { FREE_MESSAGE_QUOTA } from '@/lib/quota';
import { deleteSecureValue, readSecureValue, writeSecureValue } from '@/lib/secureKv';

const BOOK_KEY = 'bugece.accounts';
const SESSION_KEY = 'bugece.session-account';

export type MemberAccount = {
  accountId: string;
  email: string;
  displayName: string;
  passwordHash: string;
  /** Missing on older password accounts. Google-only accounts have no password. */
  provider?: 'password' | 'google';
  freeMessagesRemaining: number;
  isPro: boolean;
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

async function hashPassword(accountId: string, password: string): Promise<string> {
  const material = new TextEncoder().encode(`bugece:${accountId}:${password}`);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest('SHA-256', material);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (const byte of material) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `fnv:${(hash >>> 0).toString(16)}`;
}

export async function readAccountBook(): Promise<AccountBook | null> {
  const raw = await readSecureValue(BOOK_KEY);
  if (!raw.ok) return null;
  if (!raw.value) return { v: 1, accounts: {} };
  try {
    const parsed = JSON.parse(raw.value) as Partial<AccountBook>;
    if (!parsed.accounts || typeof parsed.accounts !== 'object') return null;
    return { v: 1, accounts: parsed.accounts };
  } catch {
    return null;
  }
}

async function writeAccountBook(book: AccountBook): Promise<boolean> {
  return writeSecureValue(BOOK_KEY, JSON.stringify(book));
}

export async function readSessionAccountId(): Promise<string | null> {
  const raw = await readSecureValue(SESSION_KEY);
  if (!raw.ok || !raw.value) return null;
  return normalizeEmail(raw.value);
}

export async function writeSessionAccountId(accountId: string | null): Promise<void> {
  if (!accountId) {
    await deleteSecureValue(SESSION_KEY);
    return;
  }
  await writeSecureValue(SESSION_KEY, accountId);
}

function withDisplayName(account: MemberAccount): MemberAccount {
  return {
    ...account,
    displayName: typeof account.displayName === 'string' ? account.displayName : '',
  };
}

function validateCredentials(emailInput: string, password: string): { email: string } | AuthResult {
  const email = normalizeEmail(emailInput);
  if (!email) return { ok: false, message: 'Geçerli bir e-posta yaz.' };
  if (password.trim().length < 6) return { ok: false, message: 'Şifre en az 6 karakter olsun.' };
  return { email };
}

/** Existing email only. Does not create an account or refill the quota. */
export async function signInWithPassword(emailInput: string, password: string): Promise<AuthResult> {
  const checked = validateCredentials(emailInput, password);
  if ('ok' in checked) return checked;

  const book = await readAccountBook();
  if (!book) return { ok: false, message: 'Hesaplar okunamadı. Tekrar dene.' };

  const existing = book.accounts[checked.email];
  if (!existing) return { ok: false, message: 'Bu e-posta kayıtlı değil. Kayıt ol.' };
  if (existing.provider === 'google' || !existing.passwordHash) {
    return { ok: false, message: 'Bu hesap Gmail ile açıldı. Gmail ile devam et.' };
  }
  const passwordHash = await hashPassword(checked.email, password);
  if (existing.passwordHash !== passwordHash) return { ok: false, message: 'Şifre uyuşmadı.' };
  await writeSessionAccountId(checked.email);
  return { ok: true, account: withDisplayName(existing) };
}

/** New email starts at the free quota. The same email must sign in instead. */
export async function registerAccount(
  emailInput: string,
  password: string,
  displayNameInput = '',
): Promise<AuthResult> {
  const checked = validateCredentials(emailInput, password);
  if ('ok' in checked) return checked;

  const book = await readAccountBook();
  if (!book) return { ok: false, message: 'Hesaplar okunamadı. Tekrar dene.' };
  if (book.accounts[checked.email]) {
    return { ok: false, message: 'Bu e-posta zaten kayıtlı. Giriş yap.' };
  }

  const account: MemberAccount = {
    accountId: checked.email,
    email: checked.email,
    displayName: displayNameInput.trim().slice(0, 32),
    passwordHash: await hashPassword(checked.email, password),
    provider: 'password',
    freeMessagesRemaining: FREE_MESSAGE_QUOTA,
    isPro: false,
  };
  book.accounts[checked.email] = account;
  const wrote = await writeAccountBook(book);
  if (!wrote) return { ok: false, message: 'Hesap kaydedilemedi. Tekrar dene.' };
  await writeSessionAccountId(checked.email);
  return { ok: true, account };
}

/**
 * Same email as a password account restores that stored remaining count.
 * A new Google email starts at the free quota and does not refill an existing one.
 */
export async function signInWithGoogle(emailInput: string, displayNameInput = ''): Promise<AuthResult> {
  const email = normalizeEmail(emailInput);
  if (!email) return { ok: false, message: 'Google hesabından e-posta alınamadı.' };

  const book = await readAccountBook();
  if (!book) return { ok: false, message: 'Hesaplar okunamadı. Tekrar dene.' };

  const existing = book.accounts[email];
  if (existing) {
    const account = withDisplayName(existing);
    const incoming = displayNameInput.trim().slice(0, 32);
    if (!account.displayName && incoming) {
      account.displayName = incoming;
      book.accounts[email] = account;
      await writeAccountBook(book);
    }
    await writeSessionAccountId(email);
    return { ok: true, account };
  }

  const account: MemberAccount = {
    accountId: email,
    email,
    displayName: displayNameInput.trim().slice(0, 32),
    passwordHash: '',
    provider: 'google',
    freeMessagesRemaining: FREE_MESSAGE_QUOTA,
    isPro: false,
  };
  book.accounts[email] = account;
  const wrote = await writeAccountBook(book);
  if (!wrote) return { ok: false, message: 'Hesap kaydedilemedi. Tekrar dene.' };
  await writeSessionAccountId(email);
  return { ok: true, account };
}

export async function saveAccountQuota(
  accountId: string,
  quota: { freeMessagesRemaining: number; isPro: boolean },
): Promise<void> {
  const book = await readAccountBook();
  if (!book) return;
  const current = book.accounts[accountId];
  if (!current) return;
  book.accounts[accountId] = {
    ...current,
    freeMessagesRemaining: quota.freeMessagesRemaining,
    isPro: quota.isPro,
  };
  await writeAccountBook(book);
}
