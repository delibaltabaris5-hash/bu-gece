import { getSupabase } from '@/lib/supabaseClient';

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

function parseRow(row: Record<string, unknown>): ChatMessageDoc | null {
  const text = typeof row.body === 'string' ? row.body.trim() : '';
  const senderId = typeof row.sender_id === 'string' ? row.sender_id : '';
  const id = typeof row.id === 'string' ? row.id : '';
  const chatId = typeof row.chat_id === 'string' ? row.chat_id : '';
  if (!id || !text || !senderId) return null;
  const created = typeof row.created_at === 'string' ? Date.parse(row.created_at) : 0;
  return {
    id,
    chatId,
    senderId,
    senderType: row.sender_type === 'bot' ? 'bot' : 'user',
    text: text.slice(0, MESSAGE_MAX),
    createdAt: Number.isFinite(created) ? created : Date.now(),
    type: 'text',
    status: row.status === 'failed' || row.status === 'sending' ? row.status : 'sent',
  };
}

async function loadMessages(chatId: string): Promise<ChatMessageDoc[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(80);
  if (error || !data) return [];
  return data.map((row) => parseRow(row as Record<string, unknown>)).filter((item): item is ChatMessageDoc => item !== null);
}

export function subscribeChat(
  chatId: string,
  onMessages: (messages: ChatMessageDoc[]) => void,
  onError?: () => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase || !chatId) {
    onError?.();
    return () => undefined;
  }
  let closed = false;
  const pull = () => {
    void loadMessages(chatId).then((messages) => {
      if (!closed) onMessages(messages);
    }).catch(() => onError?.());
  };
  pull();
  const channel = supabase
    .channel(`messages-${chatId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, pull)
    .subscribe();
  return () => {
    closed = true;
    void supabase.removeChannel(channel);
  };
}

export async function ensureChat(chatId: string, members: string[], last?: { text: string; senderId: string }): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !chatId || members.length < 2) return false;
  const { error: chatError } = await supabase.from('chats').upsert({
    id: chatId,
    ...(last ? { last_message: last.text.slice(0, 200), last_at: new Date().toISOString(), last_sender_id: last.senderId } : {}),
  });
  if (chatError) return false;
  const ids = [...new Set(members.map(cleanId).filter(Boolean))];
  for (const userId of ids) {
    const { error } = await supabase.from('chat_members').upsert({ chat_id: chatId, user_id: userId });
    if (error) return false;
  }
  return true;
}

export async function writeChatMessage(input: {
  chatId: string;
  messageId: string;
  senderId: string;
  senderType: SenderType;
  text: string;
  members: string[];
}): Promise<boolean> {
  const supabase = getSupabase();
  const text = input.text.trim().slice(0, MESSAGE_MAX);
  if (!supabase || !input.chatId || !text) return false;
  const ready = await ensureChat(input.chatId, input.members, { text, senderId: input.senderId });
  if (!ready) return false;
  const { error } = await supabase.from('messages').insert({
    id: input.messageId,
    chat_id: input.chatId,
    sender_id: input.senderId,
    sender_type: input.senderType,
    body: text,
    type: 'text',
    status: 'sent',
  });
  return !error;
}

export function newMessageId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
