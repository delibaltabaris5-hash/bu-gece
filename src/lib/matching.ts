import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

import { ensureChat, writeChatMessage } from '@/lib/chats';
import { getPresenceDb } from '@/lib/firebaseApp';
import { isMatchMood, matchMoodLabel, type MatchMood } from '@/lib/matchMoods';

export type MatchListen = {
  matchStatus: 'idle' | 'waiting' | 'matched';
  mood: MatchMood | null;
  matchId: string | null;
  matchedWith: string | null;
};

function emptyListen(): MatchListen {
  return { matchStatus: 'idle', mood: null, matchId: null, matchedWith: null };
}

function readUser(row: Record<string, unknown> | undefined): MatchListen {
  if (!row) return emptyListen();
  const status = row.matchStatus === 'waiting' || row.matchStatus === 'matched' ? row.matchStatus : 'idle';
  return {
    matchStatus: status,
    mood: typeof row.mood === 'string' && isMatchMood(row.mood) ? row.mood : null,
    matchId: typeof row.matchId === 'string' ? row.matchId : null,
    matchedWith: typeof row.matchedWith === 'string' ? row.matchedWith : null,
  };
}

export function listenMatch(uid: string, onChange: (state: MatchListen) => void): () => void {
  const db = getPresenceDb();
  if (!db || !uid) {
    onChange(emptyListen());
    return () => undefined;
  }
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onChange(readUser(snap.data() as Record<string, unknown> | undefined)),
    () => onChange(emptyListen()),
  );
}

function pairId(a: string, b: string): { matchId: string; chatId: string; first: string; second: string } {
  const [first, second] = [a, b].sort();
  const chatId = `${first}_${second}`;
  return { matchId: `m_${chatId}`, chatId, first, second };
}

async function claim(uid: string, mood: MatchMood, peer: string): Promise<void> {
  const db = getPresenceDb();
  if (!db) return;
  await setDoc(doc(db, 'matchSlot', uid), { uid, mood, claim: peer, status: 'waiting' }, { merge: true });
}

async function slotClaim(uid: string): Promise<string> {
  const db = getPresenceDb();
  if (!db) return '';
  const snap = await getDoc(doc(db, 'matchSlot', uid));
  const claim = snap.data()?.claim;
  return typeof claim === 'string' ? claim : '';
}

async function finishPair(uid: string, peer: string, mood: MatchMood): Promise<void> {
  const db = getPresenceDb();
  if (!db) return;
  const { matchId, chatId, first, second } = pairId(uid, peer);
  const label = matchMoodLabel(mood);
  const text = `İkiniz de ${label} modundasınız.`;
  await setDoc(doc(db, 'matches', matchId), {
    users: [first, second],
    mood,
    chatId,
    status: 'active',
    createdAt: Date.now(),
  });
  await setDoc(
    doc(db, 'users', uid),
    { uid, matchStatus: 'matched', matchedWith: peer, matchId, mood },
    { merge: true },
  );
  await ensureChat(chatId, [first, second], { text, senderId: 'bot-eslesme' });
  await writeChatMessage({
    chatId,
    messageId: `sys_${matchId}`,
    senderId: 'bot-eslesme',
    senderType: 'bot',
    text,
    members: [first, second],
  });
  await deleteDoc(doc(db, 'matchQueue', uid)).catch(() => undefined);
  await deleteDoc(doc(db, 'matchSlot', uid)).catch(() => undefined);
}

/** Looks for one person already waiting in the same mood. A match is written only when both claims point at each other. */
export async function tryPair(uid: string, mood: MatchMood): Promise<void> {
  const db = getPresenceDb();
  if (!db || !uid || !isMatchMood(mood)) return;
  const mine = await getDoc(doc(db, 'users', uid));
  if (mine.data()?.matchStatus === 'matched') return;
  const pool = await getDocs(
    query(collection(db, 'matchQueue'), where('mood', '==', mood), where('status', '==', 'waiting'), limit(8)),
  );
  const others = pool.docs.map((item) => item.id).filter((id) => id !== uid);
  if (others.length === 0) return;
  let incoming = '';
  for (const other of others) {
    if ((await slotClaim(other)) === uid) {
      incoming = other;
      break;
    }
  }
  const current = await slotClaim(uid);
  const peer = incoming || (others.includes(current) ? current : others[0]);
  if (!peer) return;
  if (current !== peer) await claim(uid, mood, peer);
  if ((await slotClaim(peer)) !== uid) return;
  try {
    await finishPair(uid, peer, mood);
  } catch {
    // The other client may have created the same match. Still record our side if the match exists.
    const { matchId } = pairId(uid, peer);
    const match = await getDoc(doc(db, 'matches', matchId));
    if (!match.exists()) return;
    await setDoc(
      doc(db, 'users', uid),
      { uid, matchStatus: 'matched', matchedWith: peer, matchId, mood },
      { merge: true },
    ).catch(() => undefined);
  }
}

export async function joinMatchQueue(uid: string, mood: MatchMood): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = getPresenceDb();
  if (!db || !uid) return { ok: false, message: 'Eşleşme şu an başlamıyor.' };
  if (!isMatchMood(mood)) return { ok: false, message: 'Bir ruh hali seç.' };
  const mine = await getDoc(doc(db, 'users', uid));
  if (mine.data()?.matchStatus === 'matched') return { ok: false, message: 'Zaten bir eşleşmen var.' };
  try {
    const now = Date.now();
    await setDoc(
      doc(db, 'users', uid),
      { uid, mood, moodUpdatedAt: now, matchStatus: 'waiting' },
      { merge: true },
    );
    await setDoc(doc(db, 'matchQueue', uid), { uid, mood, status: 'waiting', joinedAt: now });
    await setDoc(doc(db, 'matchSlot', uid), { uid, mood, claim: '', status: 'waiting' });
    await tryPair(uid, mood);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Havuza yazılamadı. Tekrar dene.' };
  }
}

export async function leaveMatchQueue(uid: string): Promise<void> {
  const db = getPresenceDb();
  if (!db || !uid) return;
  const mine = await getDoc(doc(db, 'users', uid));
  if (mine.data()?.matchStatus === 'matched') return;
  await deleteDoc(doc(db, 'matchQueue', uid)).catch(() => undefined);
  await deleteDoc(doc(db, 'matchSlot', uid)).catch(() => undefined);
  await setDoc(doc(db, 'users', uid), { uid, matchStatus: 'idle' }, { merge: true }).catch(() => undefined);
}

export async function saveMatchMood(uid: string, mood: MatchMood): Promise<void> {
  const db = getPresenceDb();
  if (!db || !uid || !isMatchMood(mood)) return;
  await leaveMatchQueue(uid);
  await setDoc(
    doc(db, 'users', uid),
    { uid, mood, moodUpdatedAt: Date.now(), matchStatus: 'idle' },
    { merge: true },
  );
}
