/** Registration and match moods. Catalog room tempos stay on the older Mood type. */
export const MATCH_MOODS = [
  { value: 'mutlu', label: 'Mutlu' },
  { value: 'uzgun', label: 'Üzgün' },
  { value: 'kizgin', label: 'Kızgın' },
  { value: 'sakin', label: 'Sakin' },
  { value: 'heyecanli', label: 'Heyecanlı' },
  { value: 'yalniz', label: 'Yalnız' },
  { value: 'flort', label: 'Flört' },
  { value: 'sohbet', label: 'Sohbet' },
] as const;

export type MatchMood = (typeof MATCH_MOODS)[number]['value'];

export const MATCH_SECONDS = 15;
export const MATCH_ROUNDS = 3;

export function isMatchMood(value: string | null | undefined): value is MatchMood {
  return MATCH_MOODS.some((mood) => mood.value === value);
}

export function matchMoodLabel(value: string | null | undefined): string {
  return MATCH_MOODS.find((mood) => mood.value === value)?.label ?? 'Ruh hali';
}
