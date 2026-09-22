import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { purchasePro } from '@/billing/mockProBilling';
import { botReply, dmReply } from '@/data/bot';
import { assertCatalog } from '@/data/catalog';
import { getRoom } from '@/data/rooms';
import { buildSeedMessages } from '@/data/seedMessages';
import { topicForDay } from '@/data/topics';
import { topicBody, todayKey } from '@/lib/format';
import { pickStableNick, pickTempNumber } from '@/lib/identity';
import { FREE_MESSAGE_QUOTA } from '@/lib/quota';
import type {
  ChatMessage,
  DirectMessage,
  Gender,
  Mood,
  RoomId,
} from '@/types';

interface PersistedSlice {
  onboarded: boolean;
  gender: Gender | null;
  roomId: RoomId | null;
  mood: Mood | null;
  isPro: boolean;
  stableNick: string;
  tempNick: string;
  roomMessages: Record<RoomId, ChatMessage[]>;
  directMessages: Record<string, DirectMessage[]>;
  topicDayByRoom: Partial<Record<RoomId, string>>;
  freeMessagesRemaining: number;
}

interface AppState extends PersistedSlice {
  hydrated: boolean;
  proBusy: boolean;
  completeOnboarding: (input: {
    gender: Gender;
    roomId: RoomId;
    mood: Mood | null;
  }) => void;
  resetIdentity: () => void;
  unlockPro: () => Promise<boolean>;
  revokePro: () => void;
  ensureDailyTopic: (roomId: RoomId) => void;
  postRoomMessage: (roomId: RoomId, text: string) => boolean;
  postDirectMessage: (memberId: string, text: string) => void;
}

function trimThread<T>(items: T[]): T[] {
  return items.slice(-100);
}

const emptyPersisted = (): PersistedSlice => ({
  onboarded: false,
  gender: null,
  roomId: null,
  mood: null,
  isPro: false,
  stableNick: '',
  tempNick: '',
  roomMessages: buildSeedMessages(),
  directMessages: {},
  topicDayByRoom: {},
  freeMessagesRemaining: FREE_MESSAGE_QUOTA,
});

assertCatalog();

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...emptyPersisted(),
      hydrated: false,
      proBusy: false,
      completeOnboarding: ({ gender, roomId, mood }) => {
        const room = getRoom(roomId);
        set({
          onboarded: true,
          gender,
          roomId,
          mood,
          stableNick: pickStableNick(),
          tempNick: `${room?.name ?? 'Oda'}_${pickTempNumber()}`,
        });
      },
      resetIdentity: () => {
        set({
          onboarded: false,
          gender: null,
          roomId: null,
          mood: null,
          stableNick: '',
          tempNick: '',
          freeMessagesRemaining: FREE_MESSAGE_QUOTA,
        });
      },
      unlockPro: async () => {
        if (get().proBusy) return get().isPro;
        set({ proBusy: true });
        try {
          const result = await purchasePro();
          if (result.ok) set({ isPro: true });
          return result.ok;
        } finally {
          set({ proBusy: false });
        }
      },
      revokePro: () => set({ isPro: false }),
      ensureDailyTopic: (roomId) => {
        const today = todayKey();
        const state = get();
        const id = `topic_${roomId}_${today}`;
        const existing = state.roomMessages[roomId] ?? [];
        if (state.topicDayByRoom[roomId] === today || existing.some((item) => item.id === id)) {
          return;
        }
        const topic = topicForDay(roomId, today);
        const message: ChatMessage = {
          id,
          roomId,
          authorKind: 'bot',
          text: topicBody(topic.quote, topic.question),
          createdAt: Date.now(),
        };
        set({
          topicDayByRoom: { ...state.topicDayByRoom, [roomId]: today },
          roomMessages: {
            ...state.roomMessages,
            [roomId]: trimThread([...existing, message]),
          },
        });
      },
      postRoomMessage: (roomId, text) => {
        const trimmed = text.trim().slice(0, 400);
        if (!trimmed) return false;
        const state = get();
        if (!state.isPro && state.freeMessagesRemaining <= 0) return false;
        const room = getRoom(roomId);
        const now = Date.now();
        const current = state.roomMessages[roomId] ?? [];
        const userMessage: ChatMessage = {
          id: `self_${roomId}_${now}`,
          roomId,
          authorKind: 'self',
          text: trimmed,
          createdAt: now,
        };
        set({
          freeMessagesRemaining: state.isPro
            ? state.freeMessagesRemaining
            : state.freeMessagesRemaining - 1,
          roomMessages: {
            ...state.roomMessages,
            [roomId]: trimThread([...current, userMessage]),
          },
        });
        const selfCount = current.filter((item) => item.authorKind === 'self').length;
        const asked = trimmed.includes('?');
        if (!asked && selfCount % 2 === 1) return true;
        const replyText = botReply(room?.name ?? 'Oda', selfCount + trimmed.length);
        setTimeout(() => {
          const latest = get().roomMessages[roomId] ?? [];
          const reply: ChatMessage = {
            id: `bot_reply_${roomId}_${Date.now()}`,
            roomId,
            authorKind: 'bot',
            text: replyText,
            createdAt: Date.now(),
          };
          set({
            roomMessages: {
              ...get().roomMessages,
              [roomId]: trimThread([...latest, reply]),
            },
          });
        }, 800);
        return true;
      },
      postDirectMessage: (memberId, text) => {
        if (!get().isPro) return;
        const trimmed = text.trim().slice(0, 400);
        if (!trimmed) return;
        const now = Date.now();
        const current = get().directMessages[memberId] ?? [];
        const mine: DirectMessage = {
          id: `dm_self_${memberId}_${now}`,
          memberId,
          from: 'self',
          text: trimmed,
          createdAt: now,
        };
        set({
          directMessages: {
            ...get().directMessages,
            [memberId]: trimThread([...current, mine]),
          },
        });
        const replyText = dmReply(current.length + trimmed.length);
        setTimeout(() => {
          const latest = get().directMessages[memberId] ?? [];
          const reply: DirectMessage = {
            id: `dm_member_${memberId}_${Date.now()}`,
            memberId,
            from: 'member',
            text: replyText,
            createdAt: Date.now(),
          };
          set({
            directMessages: {
              ...get().directMessages,
              [memberId]: trimThread([...latest, reply]),
            },
          });
        }, 700);
      },
    }),
    {
      name: 'bu-gece-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as PersistedSlice;
        if (version < 2 && typeof state.freeMessagesRemaining !== 'number') {
          return { ...state, freeMessagesRemaining: FREE_MESSAGE_QUOTA };
        }
        return state;
      },
      partialize: (state): PersistedSlice => ({
        onboarded: state.onboarded,
        gender: state.gender,
        roomId: state.roomId,
        mood: state.mood,
        isPro: state.isPro,
        stableNick: state.stableNick,
        tempNick: state.tempNick,
        roomMessages: state.roomMessages,
        directMessages: state.directMessages,
        topicDayByRoom: state.topicDayByRoom,
        freeMessagesRemaining: state.freeMessagesRemaining,
      }),
    },
  ),
);
