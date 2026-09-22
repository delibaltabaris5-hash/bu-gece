import type { QuotaSnapshot } from '@/lib/quotaReconcile';

/**
 * TODO(SPEC): Server-bound free-message quota.
 * See docs/SPEC-server-quota.md.
 *
 * SecureStore cannot fully stop a reinstall from minting free messages
 * (Android clears it). Full protection needs an account — Apple, Google, or
 * phone — and a server counter. This stub returns null and must not grant
 * messages or Pro.
 */
export type ServerQuota = QuotaSnapshot & {
  accountId: string;
};

export async function fetchServerQuota(_deviceId: string): Promise<ServerQuota | null> {
  return null;
}
