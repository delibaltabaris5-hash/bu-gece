export interface ProPurchaseResult {
  ok: boolean;
  source: 'mock';
  reason?: string;
}

const MOCK_DELAY_MS = 350;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Billing boundary for the MVP.
 * Screens call the store; the store calls this module.
 * A later Google Play Billing adapter can replace these two functions
 * without changing the paywall UI.
 */
export async function purchasePro(): Promise<ProPurchaseResult> {
  await wait(MOCK_DELAY_MS);
  return { ok: true, source: 'mock' };
}

export async function restorePro(): Promise<ProPurchaseResult> {
  await wait(MOCK_DELAY_MS);
  return {
    ok: false,
    source: 'mock',
    reason: 'Bu sürümde mağaza geri yüklemesi yok. Pro kilidi yalnızca bu cihazda durur.',
  };
}
