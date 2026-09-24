import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { getPresenceDb } from '@/lib/firebaseApp';
import { isMatchMood, type MatchMood } from '@/lib/matchMoods';

export type MatchListen = {
  matchStatus: 'idle' | 'waiting' | 'matched';
  mood: MatchMood | null;
  matchId: string | null;
  matchedWith: string | null;
};

function emptyListen(): MatchListen {
  return { matchStatus: 'idle', mood: null, matchId: null, matchedWith: null };
}

export function listenMatch(uid: string, onChange: (state: MatchListen) => void): () => void {
  const db = getPresenceDb();
  if (!db || !uid) {
    onChange(emptyListen());
    return () => undefined;
  }
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      const data = snap.data() ?? {};
      const status = data.matchStatus === 'waiting' || data.matchStatus === 'matched' ? data.matchStatus : 'idle';
      onChange({
        matchStatus: status,
        mood: isMatchMood(data.mood) ? data.mood : null,
        matchId: typeof data.matchId === 'string' ? data.matchId : null,
        matchedWith: typeof data.matchedWith === 'string' ? data.matchedWith : null,
      });
    },
    () => onChange(emptyListen()),
  );
}

/** Join the pool. Does not create a match. A matched account stays out. */
export async function joinMatchQueue(uid: string, mood: MatchMood): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = getPresenceDb();
  if (!db) return { ok: false, message: 'Eşleşme şu an başlamıyor.' };
  if (!isMatchMood(mood)) return { ok: false, message: 'Bir ruh hali seç.' };
  try {
    await updateDoc(doc(db, 'users', uid), {
      mood,
      moodUpdatedAt: Date.now(),
      matchStatus: 'waiting',
    });
    await setDoc(doc(db, 'matchQueue', uid), {
      uid,
      mood,
      joinedAt: serverTimestamp(),
      status: 'waiting',
    });
    return { ok: true };
  } catch {
    return { ok: false, message: 'Havuza yazılamadı. Tekrar dene.' };
  }
}

export async function leaveMatchQueue(uid: string): Promise<void> {
  const db = getPresenceDb();
  if (!db || !uid) return;
  await deleteDoc(doc(db, 'matchQueue', uid)).catch(() => undefined);
  await updateDoc(doc(db, 'users', uid), { matchStatus: 'idle' }).catch(() => undefined);
}

export async function saveMatchMood(uid: string, mood: MatchMood): Promise<void> {
  const db = getPresenceDb();
  if (!db || !isMatchMood(mood)) return;
  await updateDoc(doc(db, 'users', uid), { mood, moodUpdatedAt: Date.now() });
  await deleteDoc(doc(db, 'matchQueue', uid)).catch(() => undefined);
}
