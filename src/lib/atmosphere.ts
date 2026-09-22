/** First-launch ambient level. Saved volume replaces this after hydration. */
export const ATMOSPHERE_DEFAULT_VOLUME = 0.15;

export const ATMOSPHERE_VOLUME_STEP = 0.08;

export function clampAtmosphereVolume(value: number): number {
  if (!Number.isFinite(value)) return ATMOSPHERE_DEFAULT_VOLUME;
  const rounded = Math.round(value * 100) / 100;
  return Math.min(1, Math.max(0, rounded));
}
