import { readAccountBook, readSessionAccountId, saveAccountQuota } from '@/lib/accountBook';
import { quotaStorageKey, resolveDeviceIdentity } from '@/lib/deviceIdentity';
import {
  applyServerQuota,
  clampRemaining,
  mergeLocalQuota,
  resolveAccountQuota,
  type QuotaSnapshot,
} from '@/lib/quotaReconcile';
import { readSecureValue, writeSecureValue } from '@/lib/secureKv';
import { fetchServerQuota } from '@/lib/serverQuota';
import { enablePersistedWrites, useAppStore } from '@/store/useAppStore';

type DeviceQuota = QuotaSnapshot & {
  accountId: string | null;
};

type StoredQuota = DeviceQuota & {
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

function parseStored(raw: string, deviceId: string): DeviceQuota | 'corrupt' {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredQuota>;
    if (typeof parsed.freeMessagesRemaining !== 'number' || !Number.isFinite(parsed.freeMessagesRemaining)) {
      return 'corrupt';
    }
    if (typeof parsed.isPro !== 'boolean') return 'corrupt';
    return {
      freeMessagesRemaining: parsed.freeMessagesRemaining,
      isPro: parsed.deviceId === deviceId ? parsed.isPro : false,
      accountId: typeof parsed.accountId === 'string' ? parsed.accountId : null,
    };
  } catch {
    return 'corrupt';
  }
}

async function persistSnapshot(next: QuotaSnapshot): Promise<void> {
  const accountId = useAppStore.getState().accountId;
  if (identityId) {
    const payload: StoredQuota = {
      v: 1,
      deviceId: identityId,
      accountId,
      freeMessagesRemaining: next.freeMessagesRemaining,
      isPro: next.isPro,
    };
    await writeSecureValue(quotaStorageKey(identityId), JSON.stringify(payload));
  }
  if (accountId) {
    await saveAccountQuota(accountId, next);
  }
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

  const parsed = raw.value ? parseStored(raw.value, identity.id) : null;
  const deviceQuota: DeviceQuota | null =
    parsed === 'corrupt' ? { freeMessagesRemaining: 0, isPro: false, accountId: null } : parsed;

  const state = useAppStore.getState();
  const sessionId = (await readSessionAccountId()) ?? state.accountId;
  const book = await readAccountBook();
  const account = sessionId && book ? book.accounts[sessionId] : undefined;

  if (account && book) {
    const sameDevice = deviceQuota?.accountId === account.accountId;
    const sameAsync = state.accountId === account.accountId;
    let snapshot: QuotaSnapshot = {
      freeMessagesRemaining: resolveAccountQuota({
        accountId: account.accountId,
        accountRemaining: account.freeMessagesRemaining,
        deviceRemaining: deviceQuota ? deviceQuota.freeMessagesRemaining : null,
        deviceAccountId: deviceQuota?.accountId ?? null,
        asyncRemaining: sameAsync ? state.freeMessagesRemaining : null,
        asyncAccountId: state.accountId,
      }),
      isPro: account.isPro || (sameDevice && !!deviceQuota?.isPro) || (sameAsync && state.isPro),
    };
    try {
      snapshot = applyServerQuota(snapshot, await fetchServerQuota(account.accountId));
    } catch {
      // The stub must not block the local counter.
    }
    ceiling = snapshot.freeMessagesRemaining;
    useAppStore.setState({
      accountId: account.accountId,
      accountEmail: account.email,
      accountName: account.displayName ?? '',
      authStepDone: true,
      freeMessagesRemaining: snapshot.freeMessagesRemaining,
      isPro: snapshot.isPro,
    });
    await persistSnapshot(snapshot);
  } else if (!state.accountId && deviceQuota && !deviceQuota.accountId) {
    let merged = mergeLocalQuota(
      { freeMessagesRemaining: state.freeMessagesRemaining, isPro: state.isPro },
      deviceQuota,
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
  }

  writesEnabled = true;
  attachMirror();
}

/** Replace the session ceiling with this account's stored balance. A new email may be 10. */
export async function bindSignedInAccount(input: {
  accountId: string;
  email: string;
  displayName?: string;
  freeMessagesRemaining: number;
  isPro: boolean;
}): Promise<void> {
  let remaining = clampRemaining(input.freeMessagesRemaining);
  if (identityId) {
    const raw = await readSecureValue(quotaStorageKey(identityId));
    if (raw.ok && raw.value) {
      const parsed = parseStored(raw.value, identityId);
      if (parsed !== 'corrupt' && parsed.accountId === input.accountId) {
        remaining = Math.min(remaining, clampRemaining(parsed.freeMessagesRemaining));
      }
    }
  }
  ceiling = remaining;
  writesEnabled = true;
  attachMirror();
  useAppStore.setState({
    accountId: input.accountId,
    accountEmail: input.email,
    accountName: input.displayName ?? '',
    authStepDone: true,
    freeMessagesRemaining: remaining,
    isPro: input.isPro,
  });
  await persistSnapshot({ freeMessagesRemaining: remaining, isPro: input.isPro });
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
