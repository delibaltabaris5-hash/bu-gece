import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, setDoc } from 'firebase/firestore';

import { getFirebaseApp, getPresenceDb } from '@/lib/firebaseApp';
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
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
  if (code === 'auth/email-already-in-use') return 'Bu e-posta zaten kayıtlı. Giriş yap.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-login-credentials') {
    return 'E-posta veya şifre uyuşmadı.';
  }
  if (code === 'auth/network-request-failed') return 'İnternet bağlantısı yok.';
  if (code === 'auth/weak-password' || code === 'auth/missing-password') return 'Şifre en az 6 karakter olsun.';
  if (code === 'auth/invalid-email') return 'Geçerli bir e-posta yaz.';
  const message = error instanceof Error ? error.message : '';
  const lower = message.toLowerCase();
  if (lower.includes('already') || lower.includes('registered')) return 'Bu e-posta zaten kayıtlı. Giriş yap.';
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) return 'E-posta veya şifre uyuşmadı.';
  return fallback;
}

function accountFromUserDoc(uid: string, row: Record<string, unknown>): MemberAccount {
  const mood = typeof row.mood === 'string' && isMatchMood(row.mood) ? row.mood : null;
  return {
    accountId: uid,
    email: typeof row.email === 'string' ? row.email : '',
    displayName: typeof row.name === 'string' ? row.name : '',
    passwordHash: '',
    provider: row.provider === 'google' ? 'google' : 'password',
    freeMessagesRemaining: typeof row.freeMessagesRemaining === 'number' ? row.freeMessagesRemaining : FREE_MESSAGE_QUOTA,
    isPro: row.isPro === true,
    mood,
  };
}

export async function listRegisteredUsers(): Promise<MemberAccount[]> {
  const db = getPresenceDb();
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'users'), limit(40)));
  return snap.docs.map((item) => accountFromUserDoc(item.id, item.data() as Record<string, unknown>));
}

export async function clearLegacyLocalAccounts(): Promise<void> {
  await deleteSecureValue(LEGACY_BOOK_KEY);
  await deleteSecureValue(LEGACY_SESSION_KEY);
}

function firebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

function waitForFirebaseUser(): Promise<FirebaseUser | null> {
  const auth = firebaseAuth();
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function readSessionAccountId(): Promise<string | null> {
  await clearLegacyLocalAccounts();
  const firebaseUser = await waitForFirebaseUser();
  if (firebaseUser) return firebaseUser.uid;
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
    const auth = firebaseAuth();
    if (auth) await firebaseSignOut(auth).catch(() => undefined);
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut().catch(() => undefined);
    return;
  }
  await writeSecureValue(SESSION_KEY, accountId);
}

export async function loadAccountByUid(uid: string): Promise<MemberAccount | null> {
  if (!uid) return null;
  const db = getPresenceDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return accountFromUserDoc(uid, snap.data() as Record<string, unknown>);
}

function validateCredentials(emailInput: string, password: string): { email: string } | AuthResult {
  const email = normalizeEmail(emailInput);
  if (!email) return { ok: false, message: 'Geçerli bir e-posta yaz.' };
  if (password.trim().length < 6) return { ok: false, message: 'Şifre en az 6 karakter olsun.' };
  return { email };
}

async function touchLogin(user: FirebaseUser): Promise<MemberAccount> {
  const db = getPresenceDb();
  if (!db) throw new Error('Veritabanı hazır değil.');
  const ref = doc(db, 'users', user.uid);
  const existing = await getDoc(ref);
  if (!existing.exists()) throw new Error('Profil bulunamadı.');
  const previous = existing.data() as Record<string, unknown>;
  await setDoc(ref, { uid: user.uid, lastLoginAt: Date.now() }, { merge: true });
  return accountFromUserDoc(user.uid, { ...previous, lastLoginAt: Date.now() });
}

export async function signInWithPassword(emailInput: string, password: string): Promise<AuthResult> {
  const checked = validateCredentials(emailInput, password);
  if ('ok' in checked) return checked;
  const auth = firebaseAuth();
  if (!auth) return { ok: false, message: 'Firebase hazır değil.' };
  try {
    const cred = await signInWithEmailAndPassword(auth, checked.email, password);
    const account = await touchLogin(cred.user);
    await writeSessionAccountId(cred.user.uid);
    return { ok: true, account };
  } catch (error) {
    return { ok: false, message: authErrorMessage(error, 'Giriş yapılamadı. Tekrar dene.') };
  }
}

/** Creates the auth user and users/{uid} together. Mood is required. Does not overwrite an existing email. */
export async function registerAccount(
  emailInput: string,
  password: string,
  displayNameInput = '',
  moodInput = '',
): Promise<AuthResult> {
  const checked = validateCredentials(emailInput, password);
  if ('ok' in checked) return checked;
  if (!isMatchMood(moodInput)) return { ok: false, message: 'Bir ruh hali seç.' };
  const auth = firebaseAuth();
  const db = getPresenceDb();
  if (!auth || !db) return { ok: false, message: 'Firebase hazır değil.' };
  try {
    const cred = await createUserWithEmailAndPassword(auth, checked.email, password);
    const name = displayNameInput.trim().slice(0, 32) || checked.email.split('@')[0]?.slice(0, 32) || 'Gece';
    if (displayNameInput.trim()) await updateProfile(cred.user, { displayName: name }).catch(() => undefined);
    const now = Date.now();
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email: checked.email,
      name,
      photoUrl: '',
      provider: 'password',
      mood: moodInput,
      moodUpdatedAt: now,
      createdAt: now,
      lastLoginAt: now,
      matchStatus: 'idle',
      freeMessagesRemaining: FREE_MESSAGE_QUOTA,
      isPro: false,
    });
    const saved = await getDoc(doc(db, 'users', cred.user.uid));
    if (!saved.exists()) throw new Error('Profil yazılamadı.');
    const account = accountFromUserDoc(cred.user.uid, saved.data() as Record<string, unknown>);
    await writeSessionAccountId(cred.user.uid);
    return { ok: true, account };
  } catch (error) {
    return { ok: false, message: authErrorMessage(error, 'Hesap kaydedilemedi. Tekrar dene.') };
  }
}

async function writeGoogleUser(user: FirebaseUser, displayNameInput: string): Promise<MemberAccount> {
  const db = getPresenceDb();
  if (!db) throw new Error('Veritabanı hazır değil.');
  const ref = doc(db, 'users', user.uid);
  const existing = await getDoc(ref);
  const previous = existing.exists() ? (existing.data() as Record<string, unknown>) : null;
  const now = Date.now();
  const name = (displayNameInput || user.displayName || (typeof previous?.name === 'string' ? previous.name : '')).trim().slice(0, 32);
  await setDoc(
    ref,
    {
      uid: user.uid,
      email: user.email ?? (typeof previous?.email === 'string' ? previous.email : ''),
      name,
      photoUrl: user.photoURL ?? (typeof previous?.photoUrl === 'string' ? previous.photoUrl : ''),
      provider: 'google',
      lastLoginAt: now,
      createdAt: typeof previous?.createdAt === 'number' ? previous.createdAt : now,
      ...(typeof previous?.mood === 'string' && isMatchMood(previous.mood)
        ? { mood: previous.mood, moodUpdatedAt: typeof previous.moodUpdatedAt === 'number' ? previous.moodUpdatedAt : now }
        : {}),
      matchStatus: previous?.matchStatus === 'waiting' || previous?.matchStatus === 'matched' ? previous.matchStatus : 'idle',
      freeMessagesRemaining:
        typeof previous?.freeMessagesRemaining === 'number' ? previous.freeMessagesRemaining : FREE_MESSAGE_QUOTA,
      isPro: previous?.isPro === true,
    },
    { merge: true },
  );
  const saved = await getDoc(ref);
  if (!saved.exists()) throw new Error('Profil yazılamadı.');
  const row = saved.data() as Record<string, unknown>;
  return {
    accountId: user.uid,
    email: typeof row.email === 'string' ? row.email : user.email ?? '',
    displayName: typeof row.name === 'string' ? row.name : name,
    passwordHash: '',
    provider: 'google',
    freeMessagesRemaining: typeof row.freeMessagesRemaining === 'number' ? row.freeMessagesRemaining : FREE_MESSAGE_QUOTA,
    isPro: row.isPro === true,
    mood: typeof row.mood === 'string' && isMatchMood(row.mood) ? row.mood : null,
  };
}

export async function signInWithGoogle(
  emailInput: string,
  displayNameInput = '',
  idToken = '',
): Promise<AuthResult> {
  const email = normalizeEmail(emailInput);
  if (!email) return { ok: false, message: 'Google hesabından e-posta alınamadı.' };
  if (!idToken) return { ok: false, message: 'idToken alınamadı. SHA-1 / Web client ID ekle, tekrar dene.' };
  const auth = firebaseAuth();
  if (!auth) return { ok: false, message: 'Firebase hazır değil.' };
  try {
    const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    const account = await writeGoogleUser(cred.user, displayNameInput);
    await writeSessionAccountId(cred.user.uid);
    return { ok: true, account };
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
    if (code === 'auth/account-exists-with-different-credential') {
      return { ok: false, message: 'Bu e-posta başka bir yöntemle kayıtlı. Şifre ile gir veya hesapları bağla.' };
    }
    if (code === 'auth/network-request-failed') return { ok: false, message: 'İnternet bağlantısı yok.' };
    if (code === 'auth/invalid-credential' || code === 'auth/missing-id-token') {
      return { ok: false, message: 'idToken alınamadı. SHA-1 / Web client ID ekle, tekrar dene.' };
    }
    return { ok: false, message: authErrorMessage(error, 'Google ile giriş yapılamadı.') };
  }
}

export async function saveAccountQuota(
  accountId: string,
  quota: { freeMessagesRemaining: number; isPro: boolean },
): Promise<void> {
  const db = getPresenceDb();
  if (!db || !accountId) return;
  await setDoc(
    doc(db, 'users', accountId),
    { uid: accountId, freeMessagesRemaining: quota.freeMessagesRemaining, isPro: quota.isPro },
    { merge: true },
  );
}
