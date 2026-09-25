export type Gender = 'kadin' | 'erkek';

export type RoomId =
  | 'felsefe'
  | 'tarih'
  | 'edebiyat'
  | 'astronomi'
  | 'sanat'
  | 'muzik'
  | 'sinema'
  | 'bilim'
  | 'psikoloji'
  | 'mitoloji';

export type Mood = 'sakin' | 'merakli' | 'sosyal' | 'derin' | 'neseli';

export type Budget = 'dusuk' | 'orta' | 'yuksek';

export type Distance = 'yakin' | 'sehir' | 'cevrimici';

export interface Room {
  id: RoomId;
  name: string;
  mark: string;
  blurb: string;
}

export interface Topic {
  id: string;
  quote: string;
  question: string;
}

export interface Member {
  id: string;
  roomId: RoomId;
  gender: Gender;
  stableNick: string;
  bio: string;
  city: string;
  /** Today's tempo. Sohbetler → Ruh Hali matches on this, not on location. */
  mood: Mood;
}

export interface NightPlan {
  id: string;
  title: string;
  summary: string;
  place: string;
  when: string;
  mood: Mood;
  budget: Budget;
  distance: Distance;
  roomId: RoomId;
}

export type AuthorKind = 'self' | 'member' | 'bot';

export interface ChatMessage {
  id: string;
  roomId: RoomId;
  authorKind: AuthorKind;
  memberId?: string;
  text: string;
  createdAt: number;
}

export interface DirectMessage {
  id: string;
  memberId: string;
  from: 'self' | 'member' | 'bot';
  text: string;
  createdAt: number;
}

export interface PlanFilter {
  mood: Mood;
  budget: Budget;
  distance: Distance;
}
