import { quotaStorageKey, resolveDeviceIdentity } from '@/lib/deviceIdentity';
import {
  applyServerQuota,
  mergeLocalQuota,
  type QuotaSnapshot,
} from '@/lib/quotaReconcile';
import { readSecureValue, writeSecureValue } from '@/lib/secureKv';
import { fetchServerQuota } from '@/lib/serverQuota';
import { enablePersistedWrites, useAppStore } from '@/store/useAppStore';

type StoredQuota = QuotaSnapshot & {
  v: 1;
  deviceId: string;
};

let identityId: string | null = null;
let ceiling: number | null = null;
let writesEnabled = false;
let mirrorAttached = false;
let queued: QuotaSnapshot | null = null;
let draining = false;
let chain: Promise<void> = Promise.resolve();

function noteCeiling(remaining: number) {
  ceiling = ceiling === null ? remaining : Math.min(ceiling, remaining);
}

function parseStored(raw: string, deviceId: string): QuotaSnapshot | 'corrupt' {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredQuota>;
    if (typeof parsed.freeMessagesRemaining !== 'number' || !Number.isFinite(parsed.freeMessagesRemaining)) {
      return 'corrupt';
    }
    if (typeof parsed.isPro !== 'boolean') return 'corrupt';
    return {
      freeMessagesRemaining: parsed.freeMessagesRemaining,
      isPro: parsed.deviceId === deviceId ? parsed.isPro : false,
    };
  } catch {
    return 'corrupt';
  }
}

async function persistSnapshot(next: QuotaSnapshot): Promise<void> {
  if (!identityId) return;
  const payload: StoredQuota = {
    v: 1,
    deviceId: identityId,
    freeMessagesRemaining: next.freeMessagesRemaining,
    isPro: next.isPro,
  };
  await writeSecureValue(quotaStorageKey(identityId), JSON.stringify(payload));
}

function enqueueWrite(next: QuotaSnapshot) {
  const remaining = ceiling === null ? next.freeMessagesRemaining : Math.min(ceiling, next.freeMessagesRemaining);
  noteCeiling(remaining);
  queued = { freeMessagesRemaining: remaining, isPro: next.isPro };
  if (draining) return;
  draining = true;
  void drain();
}

async function drain() {
  try {
    while (queued) {
      const next = queued;
      queued = null;
      await persistSnapshot(next);
    }
  } finally {
    draining = false;
    if (queued) {
      draining = true;
      void drain();
    }
  }
}

function attachMirror() {
  if (mirrorAttached) return;
  mirrorAttached = true;
  useAppStore.subscribe((state, previous) => {
    if (!writesEnabled || ceiling === null) return;
    if (state.freeMessagesRemaining > ceiling) {
      useAppStore.setState({ freeMessagesRemaining: ceiling });
      return;
    }
    if (state.freeMessagesRemaining < ceiling) noteCeiling(state.freeMessagesRemaining);
    if (
      state.freeMessagesRemaining === previous.freeMessagesRemaining &&
      state.isPro === previous.isPro
    ) {
      return;
    }
    enqueueWrite({
      freeMessagesRemaining: state.freeMessagesRemaining,
      isPro: state.isPro,
    });
  });
}

async function runOnce(): Promise<void> {
  if (!useAppStore.persist.hasHydrated()) return;
  enablePersistedWrites();

  const identity = await resolveDeviceIdentity();
  if (!identity) return;
  identityId = identity.id;

  const raw = await readSecureValue(quotaStorageKey(identity.id));
  if (!raw.ok) return;

  const state = useAppStore.getState();
  const secure = raw.value
    ? parseStored(raw.value, identity.id)
    : null;
  const secureQuota = secure === 'corrupt' ? { freeMessagesRemaining: 0, isPro: false } : secure;

  let merged = mergeLocalQuota(
    { freeMessagesRemaining: state.freeMessagesRemaining, isPro: state.isPro },
    secureQuota,
  );
  try {
    merged = applyServerQuota(merged, await fetchServerQuota(identity.id));
  } catch {
    // The stub must not block the local counter.
  }

  noteCeiling(merged.freeMessagesRemaining);
  merged = {
    ...merged,
    freeMessagesRemaining: ceiling ?? merged.freeMessagesRemaining,
  };

  if (
    merged.freeMessagesRemaining !== state.freeMessagesRemaining ||
    merged.isPro !== state.isPro
  ) {
    useAppStore.setState({
      freeMessagesRemaining: merged.freeMessagesRemaining,
      isPro: merged.isPro,
    });
  }

  await persistSnapshot(merged);
  writesEnabled = true;
  attachMirror();
}

/** Read SecureStore after AsyncStorage hydration and keep the lower free-message count. */
export function reconcileSecureQuota(): Promise<void> {
  const job = chain.then(runOnce, runOnce);
  chain = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

/**
 * If navigation opened before AsyncStorage hydration finished, bind the quota
 * once the saved Zustand state is actually in memory.
 */
export function watchSecureQuotaAfterHydration(): () => void {
  return useAppStore.persist.onFinishHydration(() => {
    if (!useAppStore.getState().hydrated) return;
    void reconcileSecureQuota();
  });
}
