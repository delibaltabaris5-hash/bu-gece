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

export const MESSAGE_MAX = 2000;

export type SenderType = 'user' | 'bot';
export type MessageStatus = 'sending' | 'sent' | 'failed';

export type ChatMessageDoc = {
  id: string;
  chatId: string;
  senderId: string;
  senderType: SenderType;
  text: string;
  createdAt: number;
  type: 'text';
  status: MessageStatus;
};

function cleanId(value: string): string {
  return value.trim();
}

export function chatIdFor(a: string, b: string): string | null {
  const left = cleanId(a);
  const right = cleanId(b);
  if (!left || !right || left === right) return null;
  if (left.includes('/') || right.includes('/') || left.includes(' ') || right.includes(' ')) return null;
  const [first, second] = [left, right].sort();
  const id = `${first}_${second}`;
  if (id.length > 700) return null;
  return id;
}

function createdAtMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    const ms = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return 0;
}

function parseMessage(chatId: string, id: string, data: DocumentData, pending: boolean): ChatMessageDoc | null {
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  const senderId = typeof data.senderId === 'string' ? data.senderId : '';
  if (!id || !text || !senderId) return null;
  const status: MessageStatus = data.status === 'failed' || data.status === 'sending' ? data.status : 'sent';
  return {
    id,
    chatId,
    senderId,
    senderType: data.senderType === 'bot' ? 'bot' : 'user',
    text: text.slice(0, MESSAGE_MAX),
    createdAt: createdAtMs(data.createdAt) || (pending ? Date.now() : 0),
    type: 'text',
    status: pending ? 'sending' : status,
  };
}

export function subscribeChat(
  chatId: string,
  onMessages: (messages: ChatMessageDoc[]) => void,
  onError?: () => void,
): () => void {
  const database = getPresenceDb();
  if (!database || !chatId) {
    onError?.();
    return () => undefined;
  }
  const recent = query(collection(database, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'), limit(80));
  return onSnapshot(
    recent,
    (snap) => {
      const messages: ChatMessageDoc[] = [];
      for (const item of snap.docs) {
        const message = parseMessage(chatId, item.id, item.data(), item.metadata.hasPendingWrites);
        if (message) messages.push(message);
      }
      onMessages(messages);
    },
    () => onError?.(),
  );
}

export async function ensureChat(chatId: string, members: string[], last?: { text: string; senderId: string }): Promise<boolean> {
  const database = getPresenceDb();
  if (!database || !chatId || members.length < 2) return false;
  try {
    await setDoc(
      doc(database, 'chats', chatId),
      {
        members: [...new Set(members.map((id) => cleanId(id)).filter(Boolean))].sort(),
        ...(last
          ? { lastMessage: last.text.slice(0, 200), lastAt: serverTimestamp(), lastSenderId: last.senderId }
          : {}),
      },
      { merge: true },
    );
    return true;
  } catch {
    return false;
  }
}

export async function writeChatMessage(input: {
  chatId: string;
  messageId: string;
  senderId: string;
  senderType: SenderType;
  text: string;
  members: string[];
}): Promise<boolean> {
  const database = getPresenceDb();
  const text = input.text.trim().slice(0, MESSAGE_MAX);
  if (!database || !input.chatId || !text) return false;
  const ready = await ensureChat(input.chatId, input.members, { text, senderId: input.senderId });
  if (!ready) return false;
  try {
    await setDoc(doc(database, 'chats', input.chatId, 'messages', input.messageId), {
      senderId: input.senderId,
      senderType: input.senderType,
      text,
      createdAt: serverTimestamp(),
      type: 'text',
      status: 'sent',
    });
    return true;
  } catch {
    return false;
  }
}

export function newMessageId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
