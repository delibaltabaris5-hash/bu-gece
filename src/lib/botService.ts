import { personaFor, type BotPersona } from '@/lib/botPersonas';

export type BotTurn = {
  role: 'user' | 'bot';
  text: string;
};

export type BotReplyInput = {
  botId: string;
  userId: string;
  userName: string;
  history: BotTurn[];
  text: string;
};

const WINDOW = 24;
const MAX_PER_SECOND = 3;
const hits = new Map<string, number[]>();

export class BotUnavailable extends Error {
  constructor() {
    super('bot şu an cevap veremiyor');
  }
}

/** At most a few replies per second for one user and bot. */
export function allowBotReply(userId: string, botId: string): boolean {
  const key = `${userId}:${botId}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < 1000);
  if (recent.length >= MAX_PER_SECOND) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/**
 * Model plug. Set EXPO_PUBLIC_BOT_ENDPOINT to a POST URL that accepts
 * { system, messages } and returns { text }. No key ships in the repo.
 */
export async function completeWithModel(input: {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}): Promise<string | null> {
  const endpoint = process.env.EXPO_PUBLIC_BOT_ENDPOINT?.trim();
  if (!endpoint) return null;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { text?: string };
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  return text || null;
}

function languageOf(text: string): 'tr' | 'en' {
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) return 'tr';
  if (/\b(the|what|why|how|hello|please|thanks)\b/i.test(text) && !/\b(bir|ve|mi|mı|değil|nasıl|neden|selam)\b/i.test(text)) {
    return 'en';
  }
  return 'tr';
}

function intentOf(text: string): 'greet' | 'question' | 'complaint' | 'flirt' | 'insult' | 'detail' | 'shift' | 'chat' {
  const value = text.toLocaleLowerCase('tr');
  if (/(amk|aq|sik|orospu|göt|piç|yarrak|fuck|shit)/i.test(value)) return 'insult';
  if (/(aşk|öp|flört|sevgili|tatlısın|hoşsun|cute)/i.test(value)) return 'flirt';
  if (/(detay|uzat|açıkla|anlatır mısın|daha fazla)/i.test(value)) return 'detail';
  if (/(şikayet|berbat|sinir|olmadı|çalışmıyor|bug|kızdım)/i.test(value)) return 'complaint';
  if (/(konu değiştir|başka konu|neyse boşver|geçelim)/i.test(value)) return 'shift';
  if (value.includes('?') || /^(ne|neden|nasıl|kim|hangi|nerede)\b/i.test(value)) return 'question';
  if (/^(selam|merhaba|hey|sa|naber|iyi akşamlar|hello|hi)\b/i.test(value)) return 'greet';
  return 'chat';
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function lastUserQuestion(history: BotTurn[], current: string): string {
  if (current.includes('?')) return clip(current, 140);
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (turn?.role === 'user' && turn.text.includes('?')) return clip(turn.text, 140);
  }
  return '';
}

function topicLine(history: BotTurn[], current: string): string {
  const users = history.filter((turn) => turn.role === 'user').slice(-3);
  const blob = [...users.map((turn) => turn.text), current].join(' ');
  return clip(blob, 180);
}

function personaMove(persona: BotPersona, said: string, topic: string): string {
  const line = clip(said, 140);
  const thread = clip(topic, 120);
  const byId: Record<string, string> = {
    'bot-felsefe': `“${line}” bir iddia. Karşı savı da koyalım: bunu herkes için doğru sayarsak ne bozulur?`,
    'bot-tarih': `“${line}” bir olay gibi duruyor. Kişi ve dönem olmadan tarih olmaz. Hangi zamana bağlıyorsun?`,
    'bot-edebiyat': `“${line}” cümlesinde yük, son kelimede. Onu bir alıntı gibi okursam anlam kayar. Hangi kelimeyi tutuyorsun?`,
    'bot-astronomi': `“${line}” gökyüzüne aitse ölçü lazım. Uzaklık ve zamanı uydurmam. Ne gördüğünü söyle.`,
    'bot-sanat': `“${line}” için önce ne göründüğünü, sonra ne hissettirdiğini ayırırım. İkisi aynı cümle değil.`,
    'bot-muzik': `“${line}” bir his. Parça adı uydurmam. Ritim mi, söz mü seni tuttu?`,
    'bot-sinema': `“${line}” bir sahne gibi. Karakter ne yapıyor, sen ne diyorsun? Filmi ben uydurmam.`,
    'bot-bilim': `“${line}” bir iddia. Kanıtın yoksa bilmiyorum derim. Tek cümleyle neyi ölçüyoruz?`,
    'bot-psikoloji': `“${line}” bir duyguya benziyor. Teşhis koymam. Adı ne, onu sen koy.`,
    'bot-mitoloji': `“${line}” hikâye tarafında duruyor. Anlatırım, olmuş gibi satmam. Kim konuşuyor bu cümlede?`,
  };
  const voice = byId[persona.id] ?? `“${line}” son cümlen. Dağıtmadan ona tutunuyorum.`;
  if (thread && thread !== line) return `${voice} Az önce de şuradaydık: ${thread}`;
  return voice;
}

function localReply(persona: BotPersona, input: BotReplyInput, history: BotTurn[]): string {
  const lang = languageOf(input.text);
  const intent = intentOf(input.text);
  const name = input.userName.trim() || (lang === 'en' ? 'there' : 'sen');
  const said = clip(input.text, 160);
  const topic = topicLine(history, input.text);
  const question = lastUserQuestion(history, input.text);
  const lastBot = [...history].reverse().find((turn) => turn.role === 'bot')?.text ?? '';

  const move = personaMove(persona, said, topic);
  const tr: Record<typeof intent, string> = {
    greet: `${name}, merhaba. Ben ${persona.name}. ${persona.style}. ${move}`,
    insult: `${name}, küfrü duydum, aynısını yazmam. Konuya dönüyorum: ${move}`,
    flirt: `${name}, flört etmem. Masada konu var: ${move}`,
    complaint: `${name}, “${said}” takılmış. Uygulamayı buradan değiştiremem. Hangi cümle kesti, onu ayıralım.`,
    detail: question
      ? `${name}, “${question}” sorusunda kalıyorum.\n\n${move}\n\nBunu dışarıdan doğrulayamam. Emin olmadığım yeri uydurmam.`
      : `${name}, “${said}” cümlesini şöyle açıyorum.\n\n${move}\n\nBir ayrıntı daha seçersen oradan devam ederim.`,
    shift: `${name}, önceki iz şuydu: ${clip(topic, 100)}. Yeni cümleyi sen kur, ben ona tutunurum.`,
    question: /pro|şifre|hesap sil|konum|fiyat/i.test(input.text)
      ? `${name}, hesap, ödeme ve konum bende değil. Onu bilemem.`
      : `${name}, “${said}”\n\n${move}\n\nBunu bakıp doğrulayamam. Bildiğim kadarı bu.`,
    chat: `${name}, ${move}`,
  };

  const en: Record<typeof intent, string> = {
    greet: `${name}, hello. I'm ${persona.name}. What are we talking about?`,
    insult: `${name}, that was sharp. I won't swear back. The thread was: ${clip(topic, 120)}`,
    flirt: `${name}, noted. I don't flirt. We can stay on this: ${clip(topic, 120)}`,
    complaint: `${name}, I heard this complaint: “${said}”. I can't change the app. Which sentence got stuck?`,
    detail: `${name}, a bit more.\n\nYou said: “${said}”.\nI can't look this up.\nThe thread so far: ${topic}.`,
    shift: `${name}, topic changed. Previous thread: ${clip(topic, 100)}.`,
    question: `${name}, you asked: “${said}”. I don't know and I can't look it up.`,
    chat: `${name}, I heard “${said}”. Thread: ${clip(topic, 140)}.`,
  };

  let text = (lang === 'en' ? en : tr)[intent];
  if (text === lastBot) {
    text = lang === 'en'
      ? `${name}, same words, different pass. I still can't invent facts. Add one concrete detail.`
      : `${name}, aynı cümleyi ikinci kez ezberlemeden alıyorum. Yeni bir ayrıntı ekle, oradan devam edeyim.`;
  }
  return text;
}

export async function replyAsBot(input: BotReplyInput): Promise<string | null> {
  if (!allowBotReply(input.userId, input.botId)) return null;
  const persona = personaFor(input.botId);
  const history = input.history.slice(-WINDOW);
  const messages = [
    ...history.map((turn) => ({
      role: turn.role === 'bot' ? ('assistant' as const) : ('user' as const),
      content: turn.text,
    })),
    { role: 'user' as const, content: input.text },
  ];
  try {
    const remote = await completeWithModel({ system: persona.system, messages });
    if (remote) return remote.slice(0, 1200);
    return localReply(persona, input, history);
  } catch {
    throw new BotUnavailable();
  }
}

export const BOT_UNAVAILABLE = 'bot şu an cevap veremiyor';
