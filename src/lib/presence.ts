import * as Crypto from 'expo-crypto';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';

import { getPresenceDb } from '@/lib/firebaseApp';
import { nickNumber } from '@/lib/identity';
import type { Gender, Mood } from '@/types';

export const PRESENCE_COLLECTION = 'presence';
/** Recently online window. Inside the 15–30 minute range from the Genel brief. */
export const PRESENCE_WINDOW_MS = 20 * 60 * 1000;
const PRESENCE_QUERY_LIMIT = 40;

export type LivePerson = {
  accountId: string;
  displayNick: string;
  gender: Gender;
  mood: Mood | null;
  online: boolean;
  lastSeenMs: number;
};

export type PresenceInput = {
  accountId: string;
  email: string;
  displayNick: string;
  gender: Gender;
  mood: Mood | null;
};

const cache = new Map<string, LivePerson>();
let warned = false;

function warnPresence(error: unknown): void {
  if (!__DEV__ || warned) return;
  warned = true;
  console.warn('[bu-gece] presence', error);
}

function asGender(value: unknown): Gender | null {
  return value === 'kadin' || value === 'erkek' ? value : null;
}

function asMood(value: unknown): Mood | null {
  if (
    value === 'sakin' ||
    value === 'merakli' ||
    value === 'sosyal' ||
    value === 'derin' ||
    value === 'neseli'
  ) {
    return value;
  }
  return null;
}

function lastSeenMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === 'object') {
    const candidate = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof candidate.toMillis === 'function') {
      const ms = candidate.toMillis();
      return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof candidate.seconds === 'number') {
      return candidate.seconds * 1000 + Math.floor((candidate.nanoseconds ?? 0) / 1e6);
    }
  }
  return 0;
}

export function parsePresence(id: string, data: DocumentData): LivePerson | null {
  const gender = asGender(data.gender);
  const displayNick = typeof data.displayNick === 'string' ? data.displayNick.trim() : '';
  const accountId = typeof data.accountId === 'string' ? data.accountId.trim() : '';
  if (!id || id.includes('/') || !gender || !displayNick || accountId !== id) return null;
  return {
    accountId,
    displayNick: displayNick.slice(0, 79),
    gender,
    mood: asMood(data.mood),
    online: data.online === true,
    lastSeenMs: lastSeenMillis(data.lastSeen),
  };
}

/**
 * Each account once. Includes the signed-in user when they are the document,
 * so a single live session is not dropped. Callers that want others only can filter.
 */
export function visibleLivePeople(
  people: LivePerson[],
  now = Date.now(),
  windowMs = PRESENCE_WINDOW_MS,
): LivePerson[] {
  const cutoff = now - windowMs;
  const seen = new Set<string>();
  const next: LivePerson[] = [];
  for (const person of people) {
    if (!person.online || person.lastSeenMs < cutoff) continue;
    if (seen.has(person.accountId)) continue;
    seen.add(person.accountId);
    next.push(person);
  }
  return next;
}

/** Pro sees the temporary nick. Free sees the same `#4821` number the seed sky uses. */
export function presenceFacingName(displayNick: string, isPro: boolean): string {
  const nick = displayNick.trim();
  if (isPro) return nick || 'Gece';
  return `#${nickNumber(nick)}`;
}

async function hashEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  try {
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized, {
      encoding: Crypto.CryptoEncoding.HEX,
    });
    return digest.length === 64 ? digest : null;
  } catch (error) {
    warnPresence(error);
    return null;
  }
}

function presenceDocId(accountId: string): string | null {
  const id = accountId.trim();
  if (!id || id.includes('/') || id.length > 320) return null;
  return id;
}

export async function publishPresence(input: PresenceInput): Promise<void> {
  const database = getPresenceDb();
  const accountId = presenceDocId(input.accountId);
  const displayNick = input.displayNick.trim().slice(0, 79);
  if (!database || !accountId || !displayNick) return;
  if (input.gender !== 'kadin' && input.gender !== 'erkek') return;
  const emailHash = await hashEmail(input.email || accountId);
  if (!emailHash) return;
  try {
    await setDoc(
      doc(database, PRESENCE_COLLECTION, accountId),
      {
        accountId,
        emailHash,
        displayNick,
        gender: input.gender,
        mood: asMood(input.mood),
        lastSeen: serverTimestamp(),
        online: true,
      },
      { merge: true },
    );
  } catch (error) {
    warnPresence(error);
  }
}

export async function markPresenceOffline(accountId: string): Promise<void> {
  const database = getPresenceDb();
  const id = presenceDocId(accountId);
  if (!database || !id) return;
  try {
    await setDoc(
      doc(database, PRESENCE_COLLECTION, id),
      { online: false, lastSeen: serverTimestamp() },
      { merge: true },
    );
  } catch (error) {
    warnPresence(error);
  }
}

export function cachedLivePerson(id: string | undefined): LivePerson | undefined {
  if (!id) return undefined;
  return cache.get(id);
}

export async function fetchLivePerson(accountId: string): Promise<LivePerson | null> {
  const cached = cachedLivePerson(accountId);
  if (cached) return cached;
  const database = getPresenceDb();
  const id = presenceDocId(accountId);
  if (!database || !id) return null;
  try {
    const snap = await getDoc(doc(database, PRESENCE_COLLECTION, id));
    if (!snap.exists()) return null;
    const person = parsePresence(snap.id, snap.data());
    if (person) cache.set(person.accountId, person);
    return person;
  } catch (error) {
    warnPresence(error);
    return null;
  }
}

export function subscribeRecentPresence(
  onPeople: (people: LivePerson[]) => void,
  onUnavailable: () => void,
): () => void {
  const database = getPresenceDb();
  if (!database) {
    onUnavailable();
    return () => undefined;
  }
  try {
    const recent = query(
      collection(database, PRESENCE_COLLECTION),
      orderBy('lastSeen', 'desc'),
      limit(PRESENCE_QUERY_LIMIT),
    );
    return onSnapshot(
      recent,
      (snap) => {
        const people: LivePerson[] = [];
        cache.clear();
        for (const item of snap.docs) {
          const person = parsePresence(item.id, item.data());
          if (!person) continue;
          cache.set(person.accountId, person);
          people.push(person);
        }
        onPeople(people);
      },
      (error) => {
        warnPresence(error);
        onUnavailable();
      },
    );
  } catch (error) {
    warnPresence(error);
    onUnavailable();
    return () => undefined;
  }
}
