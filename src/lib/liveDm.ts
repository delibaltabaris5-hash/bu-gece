import {
  collection,
  doc,
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
import { normalizeAccountId } from '@/lib/presence';

export type LiveDmMessage = {
  id: string;
  fromAccountId: string;
  text: string;
  createdAtMs: number;
};

/** Stable pair key. Both ids are normalized emails, sorted, joined by `__`. */
export function dmThreadId(a: string, b: string): string | null {
  const left = normalizeAccountId(a);
  const right = normalizeAccountId(b);
  if (!left.includes('@') || !right.includes('@') || left === right) return null;
  if (left.includes('/') || right.includes('/') || left.includes('__') || right.includes('__')) return null;
  const pair = [left, right].sort();
  return `${pair[0]}__${pair[1]}`;
}

export function decodeRouteId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let current = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

function createdAtMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    const ms = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

function parseMessage(id: string, data: DocumentData, pending: boolean): LiveDmMessage | null {
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  const fromAccountId = typeof data.fromAccountId === 'string' ? normalizeAccountId(data.fromAccountId) : '';
  if (!id || !text || !fromAccountId.includes('@')) return null;
  const stamped = createdAtMs(data.createdAt);
  return {
    id: typeof data.id === 'string' && data.id ? data.id : id,
    fromAccountId,
    text: text.slice(0, 400),
    createdAtMs: stamped || (pending ? Date.now() : 0),
  };
}

export function subscribeLiveThread(
  threadId: string,
  onMessages: (messages: LiveDmMessage[]) => void,
  onError?: () => void,
): () => void {
  const database = getPresenceDb();
  if (!database || !threadId) {
    onError?.();
    return () => undefined;
  }
  const recent = query(
    collection(database, 'dmThreads', threadId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  return onSnapshot(
    recent,
    (snap) => {
      const messages: LiveDmMessage[] = [];
      for (const item of snap.docs) {
        const message = parseMessage(item.id, item.data(), item.metadata.hasPendingWrites);
        if (message) messages.push(message);
      }
      onMessages(messages);
    },
    () => onError?.(),
  );
}

export async function sendLiveDm(input: { selfId: string; peerId: string; text: string }): Promise<string | null> {
  const database = getPresenceDb();
  const threadId = dmThreadId(input.selfId, input.peerId);
  const fromAccountId = normalizeAccountId(input.selfId);
  const text = input.text.trim().slice(0, 400);
  if (!database || !threadId || !fromAccountId || !text) return null;
  const messageId = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await setDoc(doc(database, 'dmThreads', threadId, 'messages', messageId), {
      id: messageId,
      fromAccountId,
      text,
      createdAt: serverTimestamp(),
    });
    return messageId;
  } catch {
    return null;
  }
}
