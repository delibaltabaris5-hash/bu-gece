import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type PersistStorage } from 'zustand/middleware';

import { purchasePro } from '@/billing/mockProBilling';
import { botReply, dmReply } from '@/data/bot';
import { assertCatalog } from '@/data/catalog';
import { getRoom } from '@/data/rooms';
import { buildSeedMessages } from '@/data/seedMessages';
import { topicForDay } from '@/data/topics';
import { topicBody, todayKey } from '@/lib/format';
import { pickStableNick, pickTempNumber } from '@/lib/identity';
import { ATMOSPHERE_DEFAULT_VOLUME, clampAtmosphereVolume } from '@/lib/atmosphere';
import { markPresenceOffline } from '@/lib/presence';
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
  atmosphereVolume: number;
  accountId: string | null;
  accountEmail: string | null;
  accountName: string;
  authStepDone: boolean;
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
  postDirectMessage: (memberId: string, text: string) => boolean;
  /** Live Firestore DMs use this so the local bot reply is not sent. */
  spendMessageCredit: () => boolean;
  setMood: (mood: Mood) => void;
  setAtmosphereVolume: (value: number) => void;
  continueAsGuest: () => void;
  signOut: () => void;
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
  atmosphereVolume: ATMOSPHERE_DEFAULT_VOLUME,
  accountId: null,
  accountEmail: null,
  accountName: '',
  authStepDone: false,
});

assertCatalog();

let persistWritesEnabled = false;

/** Turn on AsyncStorage writes after hydration so a default of 10 cannot overwrite a stored balance. */
export function enablePersistedWrites(): void {
  persistWritesEnabled = true;
}

const jsonStorage = createJSONStorage<PersistedSlice>(() => AsyncStorage);
if (!jsonStorage) {
  throw new Error('AsyncStorage persist is unavailable');
}

const guardedStorage: PersistStorage<PersistedSlice> = {
  getItem: (name) => jsonStorage.getItem(name),
  setItem: (name, value) => {
    if (!persistWritesEnabled) return;
    return jsonStorage.setItem(name, value);
  },
  removeItem: (name) => jsonStorage.removeItem(name),
};

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
          // Profile reset must not refill the free quota. SecureStore keeps the lower count.
        });
      },
      unlockPro: async () => {
        if (!get().accountId) return false;
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
        if (!state.accountId) return false;
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
      setAtmosphereVolume: (value) => {
        set({ atmosphereVolume: clampAtmosphereVolume(value) });
      },
      continueAsGuest: () => set({ authStepDone: true }),
      signOut: () => {
        const id = get().accountId;
        if (id) void markPresenceOffline(id);
        set({ accountId: null, accountEmail: null, accountName: '' });
      },
      setMood: (mood) => set({ mood }),
      spendMessageCredit: () => {
        const state = get();
        if (!state.accountId) return false;
        if (!state.isPro && state.freeMessagesRemaining <= 0) return false;
        if (!state.isPro) set({ freeMessagesRemaining: state.freeMessagesRemaining - 1 });
        return true;
      },
      postDirectMessage: (memberId, text) => {
        const trimmed = text.trim().slice(0, 400);
        if (!trimmed) return false;
        const state = get();
        if (!state.accountId) return false;
        if (!state.isPro && state.freeMessagesRemaining <= 0) return false;
        const now = Date.now();
        const current = state.directMessages[memberId] ?? [];
        const mine: DirectMessage = {
          id: `dm_self_${memberId}_${now}`,
          memberId,
          from: 'self',
          text: trimmed,
          createdAt: now,
        };
        set({
          freeMessagesRemaining: state.isPro
            ? state.freeMessagesRemaining
            : state.freeMessagesRemaining - 1,
          directMessages: {
            ...state.directMessages,
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
        return true;
      },
    }),
    {
      name: 'bu-gece-v1',
      storage: guardedStorage,
      version: 5,
      migrate: (persisted, version) => {
        const state = { ...(persisted as PersistedSlice) };
        // Missing count only: a number already stored (including a used 0–2 balance)
        // stays. Do not top that up to the current default of 10.
        if (version < 2 && typeof state.freeMessagesRemaining !== 'number') {
          state.freeMessagesRemaining = FREE_MESSAGE_QUOTA;
        }
        if (version < 3 && typeof state.atmosphereVolume !== 'number') {
          state.atmosphereVolume = ATMOSPHERE_DEFAULT_VOLUME;
        }
        if (version < 4) {
          if (typeof state.accountId !== 'string') state.accountId = null;
          if (typeof state.accountEmail !== 'string') state.accountEmail = null;
          if (typeof state.accountName !== 'string') state.accountName = '';
          if (typeof state.authStepDone !== 'boolean') state.authStepDone = false;
        }
        if (version < 5) {
          state.authStepDone = false;
          state.accountId = null;
          state.accountEmail = null;
          state.accountName = '';
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
        atmosphereVolume: state.atmosphereVolume,
        accountId: state.accountId,
        accountEmail: state.accountEmail,
        accountName: state.accountName,
        authStepDone: state.authStepDone,
      }),
    },
  ),
);
