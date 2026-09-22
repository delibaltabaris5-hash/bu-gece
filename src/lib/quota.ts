export const FREE_MESSAGE_QUOTA = 2;

export function quotaLabel(remaining: number, isPro: boolean): string {
  if (isPro) return 'Pro: sınırsız mesaj';
  if (remaining <= 0) return 'Ücretsiz: mesaj kalmadı';
  if (remaining <= FREE_MESSAGE_QUOTA) return 'Ücretsiz: 1–2 mesaj kaldı';
  return `Ücretsiz: ${remaining} mesaj kaldı`;
}

export function quotaRatio(remaining: number, isPro: boolean): number {
  if (isPro) return 1;
  return Math.max(0, Math.min(1, remaining / FREE_MESSAGE_QUOTA));
}
