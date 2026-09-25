import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

initializeApp();

const MOODS: Record<string, string> = {
  mutlu: 'Mutlu',
  uzgun: 'Üzgün',
  kizgin: 'Kızgın',
  sakin: 'Sakin',
  heyecanli: 'Heyecanlı',
  yalniz: 'Yalnız',
  flort: 'Flört',
  sohbet: 'Sohbet',
};

/** Pairs two waiting people with the same mood. Clients cannot write matches. */
export const pairQueue = onDocumentWritten('matchQueue/{uid}', async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;
  const self = after.data();
  const uid = event.params.uid;
  const mood = typeof self?.mood === 'string' ? self.mood : '';
  if (self?.status !== 'waiting' || !MOODS[mood] || self.uid !== uid) return;

  const db = getFirestore();
  await db.runTransaction(async (tx) => {
    const selfRef = db.collection('matchQueue').doc(uid);
    const fresh = await tx.get(selfRef);
    if (!fresh.exists || fresh.data()?.status !== 'waiting' || fresh.data()?.mood !== mood) return;

    const pool = await tx.get(
      db.collection('matchQueue').where('mood', '==', mood).where('status', '==', 'waiting').limit(8),
    );
    const peer = pool.docs.find((item) => item.id !== uid);
    if (!peer) return;
    const peerFresh = await tx.get(peer.ref);
    if (!peerFresh.exists || peerFresh.data()?.status !== 'waiting' || peerFresh.data()?.mood !== mood) return;

    const peerId = peer.id;
    const [first, second] = [uid, peerId].sort();
    const matchId = `m_${first}_${second}`;
    const chatId = `${first}_${second}`;
    const matchRef = db.collection('matches').doc(matchId);
    const existing = await tx.get(matchRef);
    if (existing.exists && existing.data()?.status === 'active') return;

    const label = MOODS[mood] ?? mood;
    tx.set(matchRef, {
      users: [first, second],
      mood,
      createdAt: FieldValue.serverTimestamp(),
      chatId,
      status: 'active',
    });
    tx.set(
      db.collection('chats').doc(chatId),
      { members: [first, second], lastMessage: `İkiniz de ${label} modundasınız.`, lastAt: FieldValue.serverTimestamp(), lastSenderId: 'bot-eslesme' },
      { merge: true },
    );
    tx.set(db.collection('chats').doc(chatId).collection('messages').doc(`sys_${matchId}`), {
      senderId: 'bot-eslesme',
      senderType: 'bot',
      text: `İkiniz de ${label} modundasınız.`,
      createdAt: FieldValue.serverTimestamp(),
      type: 'text',
      status: 'sent',
    });
    tx.set(selfRef, { status: 'matched', matchedWith: peerId, matchId }, { merge: true });
    tx.set(peer.ref, { status: 'matched', matchedWith: uid, matchId }, { merge: true });
    tx.set(db.collection('users').doc(uid), { matchStatus: 'matched', matchedWith: peerId, matchId, mood }, { merge: true });
    tx.set(db.collection('users').doc(peerId), { matchStatus: 'matched', matchedWith: uid, matchId, mood }, { merge: true });
  });
});
