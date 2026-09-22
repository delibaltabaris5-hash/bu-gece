export type QuotaSnapshot = {
  freeMessagesRemaining: number;
  isPro: boolean;
};

export function clampRemaining(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/**
 * SecureStore wins when it holds a lower remaining count. A missing secure
 * record does not invent a new allowance, and it does not raise the local one.
 * isPro sticks if either copy says the local unlock is on.
 */
export function mergeLocalQuota(
  asyncQuota: QuotaSnapshot,
  secureQuota: QuotaSnapshot | null,
): QuotaSnapshot {
  const localRemaining = clampRemaining(asyncQuota.freeMessagesRemaining);
  if (!secureQuota) {
    return { freeMessagesRemaining: localRemaining, isPro: asyncQuota.isPro };
  }
  return {
    freeMessagesRemaining: Math.min(localRemaining, clampRemaining(secureQuota.freeMessagesRemaining)),
    isPro: asyncQuota.isPro || secureQuota.isPro,
  };
}

/**
 * Account book is the balance for this email. A device or AsyncStorage count
 * can lower it only when that copy is tagged with the same account. A different
 * account does not inherit the previous balance. A new email starts at 10
 * before this function is used.
 */
export function resolveAccountQuota(input: {
  accountId: string;
  accountRemaining: number;
  deviceRemaining: number | null;
  deviceAccountId: string | null;
  asyncRemaining: number | null;
  asyncAccountId: string | null;
}): number {
  let remaining = clampRemaining(input.accountRemaining);
  if (input.deviceAccountId === input.accountId && input.deviceRemaining !== null) {
    remaining = Math.min(remaining, clampRemaining(input.deviceRemaining));
  }
  if (input.asyncAccountId === input.accountId && input.asyncRemaining !== null) {
    remaining = Math.min(remaining, clampRemaining(input.asyncRemaining));
  }
  return remaining;
}

/** A null server snapshot grants nothing. A server count can only lower the remainder. */
export function applyServerQuota(
  local: QuotaSnapshot,
  server: QuotaSnapshot | null,
): QuotaSnapshot {
  if (!server) return local;
  return {
    freeMessagesRemaining: Math.min(local.freeMessagesRemaining, clampRemaining(server.freeMessagesRemaining)),
    isPro: local.isPro || server.isPro,
  };
}
