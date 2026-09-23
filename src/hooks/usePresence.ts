import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import {
  markPresenceOffline,
  publishPresence,
  subscribeRecentPresence,
  visibleLivePeople,
  type LivePerson,
} from '@/lib/presence';
import { useAppStore } from '@/store/useAppStore';

const HEARTBEAT_MS = 4 * 60 * 1000;
let previousAccountId: string | null = null;

export function touchPresence(): void {
  const state = useAppStore.getState();
  if (!state.hydrated || !state.accountId || !state.gender || !state.tempNick.trim()) return;
  void publishPresence({
    accountId: state.accountId,
    email: state.accountEmail || state.accountId,
    displayNick: state.tempNick,
    gender: state.gender,
    mood: state.mood,
  });
}

/** Writes presence while an account is on screen, and marks the previous id offline on sign-out. */
export function usePresenceSession(): void {
  const hydrated = useAppStore((state) => state.hydrated);
  const accountId = useAppStore((state) => state.accountId);
  const accountEmail = useAppStore((state) => state.accountEmail);
  const gender = useAppStore((state) => state.gender);
  const mood = useAppStore((state) => state.mood);
  const tempNick = useAppStore((state) => state.tempNick);

  useEffect(() => {
    if (!hydrated) return;
    const previous = previousAccountId;
    previousAccountId = accountId;
    if (previous && previous !== accountId) void markPresenceOffline(previous);
    if (accountId && gender && tempNick.trim()) touchPresence();
  }, [hydrated, accountId, accountEmail, gender, mood, tempNick]);

  useEffect(() => {
    if (!hydrated || !accountId) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') touchPresence();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') touchPresence();
    }, HEARTBEAT_MS);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [hydrated, accountId]);
}

/**
 * Recently online accounts, each once. Null means Genel should keep the MEMBERS seeds:
 * Firebase is unset, the listener failed, or nobody is inside the window.
 */
export function useLivePresence(): LivePerson[] | null {
  const accountId = useAppStore((state) => state.accountId);
  const [people, setPeople] = useState<LivePerson[] | null>(null);

  useEffect(() => {
    return subscribeRecentPresence(
      (incoming) => {
        const visible = visibleLivePeople(incoming);
        setPeople(visible.length > 0 ? visible : null);
      },
      () => setPeople(null),
    );
  }, []);

  return useMemo(() => {
    if (!people) return null;
    if (!accountId) return people;
    const others = people.filter((person) => person.accountId !== accountId);
    // Others are listed without you. If you are the only live account, show yourself once
    // so the sky stays on live data instead of dropping back to the seed list.
    return others.length > 0 ? others : people;
  }, [accountId, people]);
}
