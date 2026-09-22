export const FREE_MESSAGE_QUOTA = 10;

export function quotaLabel(remaining: number, isPro: boolean): string {
  if (isPro) return 'Pro: sınırsız mesaj';
  if (remaining <= 0) return 'Ücretsiz: mesaj kalmadı';
  return `Ücretsiz: ${remaining} mesaj kaldı`;
}

export function quotaRatio(remaining: number, isPro: boolean): number {
  if (isPro) return 1;
  return Math.max(0, Math.min(1, remaining / FREE_MESSAGE_QUOTA));
}
