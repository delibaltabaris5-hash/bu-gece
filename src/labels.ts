import type { Budget, Distance, Gender, Mood } from '@/types';

export const MOODS: { value: Mood; label: string }[] = [
  { value: 'sakin', label: 'Sakin' },
  { value: 'merakli', label: 'Meraklı' },
  { value: 'sosyal', label: 'Sosyal' },
  { value: 'derin', label: 'Derin' },
  { value: 'neseli', label: 'Neşeli' },
];

export const BUDGETS: { value: Budget; label: string }[] = [
  { value: 'dusuk', label: 'Düşük' },
  { value: 'orta', label: 'Orta' },
  { value: 'yuksek', label: 'Yüksek' },
];

export const DISTANCES: { value: Distance; label: string }[] = [
  { value: 'yakin', label: 'Yürüme' },
  { value: 'sehir', label: 'Şehir' },
  { value: 'cevrimici', label: 'Çevrimiçi' },
];

export const GENDERS: { value: Gender; label: string; hint: string }[] = [
  { value: 'kadin', label: 'Kadın', hint: 'Gül kurusu simge' },
  { value: 'erkek', label: 'Erkek', hint: 'Gece mavisi simge' },
];

export function labelOf<T extends string>(
  options: { value: T; label: string }[],
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function genderLabel(gender: Gender): string {
  return gender === 'kadin' ? 'Kadın' : 'Erkek';
}
