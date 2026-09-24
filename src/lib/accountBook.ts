import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import { getFirebaseApp, getPresenceDb } from '@/lib/firebaseApp';
import { FREE_MESSAGE_QUOTA } from '@/lib/quota';
import { deleteSecureValue, writeSecureValue } from '@/lib/secureKv';

const SESSION_KEY = 'bugece.session-uid';
const LEGACY_BOOK_KEY = 'bugece.accounts';
const LEGACY_SESSION_KEY = 'bugece.session-account';

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

function firebaseAuth(): Auth {
  const app = getFirebaseApp();
  if (!app) throw new Error('Firebase hazır değil.');
  return getAuth(app);
}

function authErrorMessage(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
  if (code === 'auth/email-already-in-use') return 'Bu e-posta zaten kayıtlı. Giriş yap.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'E-posta veya şifre uyuşmadı.';
  }
  if (code === 'auth/invalid-email') return 'Geçerli bir e-posta yaz.';
  if (code === 'auth/weak-password') return 'Şifre en az 6 karakter olsun.';
  if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
    return 'E-posta kaydı Firebase’de kapalı.';
  }
  return fallback;
}

async function writeProfile(account: MemberAccount, created: boolean): Promise<void> {
  const db = getPresenceDb();
  if (!db) throw new Error('Veritabanı hazır değil.');
  const ref = doc(db, 'users', account.accountId);
  const existing = await getDoc(ref);
  if (existing.exists() && !created) return;
  await setDoc(
    ref,
    {
      uid: account.accountId,
      email: account.email,
      name: account.displayName,
      createdAt: existing.exists() ? existing.data().createdAt ?? Date.now() : Date.now(),
      freeMessagesRemaining: account.freeMessagesRemaining,
      isPro: account.isPro,
      provider: account.provider ?? 'password',
    },
    { merge: true },
  );
}

function accountFromProfile(uid: string, data: Record<string, unknown>, emailFallback: string): MemberAccount {
  return {
    accountId: uid,
    email: typeof data.email === 'string' ? data.email : emailFallback,
    displayName: typeof data.name === 'string' ? data.name : '',
    passwordHash: '',
    provider: data.provider === 'google' ? 'google' : 'password',
    freeMessagesRemaining:
      typeof data.freeMessagesRemaining === 'number' ? data.freeMessagesRemaining : FREE_MESSAGE_QUOTA,
    isPro: data.isPro === true,
  };
}

export async function listRegisteredUsers(): Promise<MemberAccount[]> {
  const db = getPresenceDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map((item) => accountFromProfile(item.id, item.data() as Record<string, unknown>, ''))
    .sort((a, b) => a.email.localeCompare(b.email, 'tr'));
}

/** Drops the old single-device JSON book. It is not the user directory. */
export async function clearLegacyLocalAccounts(): Promise<void> {
  await deleteSecureValue(LEGACY_BOOK_KEY);
  await deleteSecureValue(LEGACY_SESSION_KEY);
}

function waitForAuthUser(auth: Auth): Promise<User | null> {
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
  try {
    const user = await waitForAuthUser(firebaseAuth());
    return user?.uid ?? null;
  } catch {
    return null;
  }
}

/** Session cache only. Null signs out; it does not delete the Auth user or the profile. */
export async function writeSessionAccountId(accountId: string | null): Promise<void> {
  await clearLegacyLocalAccounts();
  if (!accountId) {
    await deleteSecureValue(SESSION_KEY);
    try {
      await firebaseSignOut(firebaseAuth());
    } catch {
      // Local session is already cleared.
    }
    return;
  }
  await writeSecureValue(SESSION_KEY, accountId);
}

export async function loadAccountByUid(uid: string): Promise<MemberAccount | null> {
  const db = getPresenceDb();
  if (!db || !uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return accountFromProfile(snap.id, snap.data() as Record<string, unknown>, '');
}

function validateCredentials(emailInput: string, password: string): { email: string } | AuthResult {
  const email = normalizeEmail(emailInput);
  if (!email) return { ok: false, message: 'Geçerli bir e-posta yaz.' };
  if (password.trim().length < 6) return { ok: false, message: 'Şifre en az 6 karakter olsun.' };
  return { email };
}

async function profileForUser(user: User, displayName: string, provider: 'password' | 'google'): Promise<MemberAccount> {
  const existing = await loadAccountByUid(user.uid);
  if (existing) return existing;
  const account: MemberAccount = {
    accountId: user.uid,
    email: user.email ?? '',
    displayName: displayName.trim().slice(0, 32),
    passwordHash: '',
    provider,
    freeMessagesRemaining: FREE_MESSAGE_QUOTA,
    isPro: false,
  };
  await writeProfile(account, true);
  return account;
}

/** Existing email only. Switches the session. Does not delete or overwrite other users. */
export async function signInWithPassword(emailInput: string, password: string): Promise<AuthResult> {
  const checked = validateCredentials(emailInput, password);
  if ('ok' in checked) return checked;
  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth(), checked.email, password);
    const account = await profileForUser(cred.user, '', 'password');
    await writeSessionAccountId(cred.user.uid);
    return { ok: true, account };
  } catch (error) {
    return { ok: false, message: authErrorMessage(error, 'Giriş yapılamadı. Tekrar dene.') };
  }
}

/** Creates Auth and users/{uid} together. The same email is an error, not an overwrite. */
export async function registerAccount(
  emailInput: string,
  password: string,
  displayNameInput = '',
): Promise<AuthResult> {
  const checked = validateCredentials(emailInput, password);
  if ('ok' in checked) return checked;
  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth(), checked.email, password);
    const account: MemberAccount = {
      accountId: cred.user.uid,
      email: checked.email,
      displayName: displayNameInput.trim().slice(0, 32),
      passwordHash: '',
      provider: 'password',
      freeMessagesRemaining: FREE_MESSAGE_QUOTA,
      isPro: false,
    };
    await writeProfile(account, true);
    await writeSessionAccountId(cred.user.uid);
    return { ok: true, account };
  } catch (error) {
    return { ok: false, message: authErrorMessage(error, 'Hesap kaydedilemedi. Tekrar dene.') };
  }
}

/** Firebase Google credential. Does not write a local-only account. */
export async function signInWithGoogle(
  emailInput: string,
  displayNameInput = '',
  idToken = '',
): Promise<AuthResult> {
  const email = normalizeEmail(emailInput);
  if (!email) return { ok: false, message: 'Google hesabından e-posta alınamadı.' };
  if (!idToken) return { ok: false, message: 'Google oturumu doğrulanamadı. E-posta ile kayıt ol.' };
  try {
    const cred = await signInWithCredential(firebaseAuth(), GoogleAuthProvider.credential(idToken));
    const account = await profileForUser(cred.user, displayNameInput, 'google');
    await writeSessionAccountId(cred.user.uid);
    return { ok: true, account };
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
    if (code === 'auth/account-exists-with-different-credential') {
      return { ok: false, message: 'Bu e-posta şifre ile kayıtlı. Giriş yap.' };
    }
    return { ok: false, message: authErrorMessage(error, 'Google ile giriş yapılamadı.') };
  }
}

/** Updates only this uid’s quota fields. Other profiles stay untouched. */
export async function saveAccountQuota(
  accountId: string,
  quota: { freeMessagesRemaining: number; isPro: boolean },
): Promise<void> {
  const db = getPresenceDb();
  if (!db || !accountId) return;
  try {
    await updateDoc(doc(db, 'users', accountId), {
      freeMessagesRemaining: quota.freeMessagesRemaining,
      isPro: quota.isPro,
    });
  } catch {
    // Missing profile is not created here and other users are not written.
  }
}
