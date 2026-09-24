import type { RoomId } from '@/types';

export type HomeScope = 'yakindakiler' | 'genel';

export type ConstellationBubble = {
  id: RoomId;
  /** Center of the circle, as a fraction of the constellation field. */
  x: number;
  y: number;
  /** Diameter as a fraction of the field width. */
  size: number;
  hero?: boolean;
  /** Yakındakiler only. The locked mock badges Tarih at 1.2 km. */
  distanceKm?: number;
};

/**
 * Positions follow the locked home mock: Felsefe in the center, the other
 * nine rooms in a ring, Tarih carrying the nearby badge.
 */
export const CONSTELLATION: ConstellationBubble[] = [
  { id: 'felsefe', x: 0.48, y: 0.46, size: 0.32, hero: true },
  { id: 'astronomi', x: 0.3, y: 0.16, size: 0.185 },
  { id: 'edebiyat', x: 0.145, y: 0.42, size: 0.178 },
  { id: 'sinema', x: 0.2, y: 0.74, size: 0.17 },
  { id: 'psikoloji', x: 0.375, y: 0.8, size: 0.162 },
  { id: 'mitoloji', x: 0.57, y: 0.755, size: 0.17 },
  { id: 'tarih', x: 0.7, y: 0.15, size: 0.21, distanceKm: 1.2 },
  { id: 'sanat', x: 0.875, y: 0.36, size: 0.178 },
  { id: 'muzik', x: 0.76, y: 0.5, size: 0.15 },
  { id: 'bilim', x: 0.86, y: 0.68, size: 0.17 },
];

export type PlacedBubble = ConstellationBubble & {
  diameter: number;
  left: number;
  top: number;
};

const LABEL_BLOCK = 18;

export function placeConstellation(width: number, height: number): PlacedBubble[] {
  if (width <= 0 || height <= 0) return [];

  const measured = CONSTELLATION.map((spec) => {
    const diameter = spec.size * width;
    const cx = spec.x * width;
    const cy = spec.y * height;
    const labelPad = spec.hero ? 0 : 12;
    const badgePad = spec.distanceKm ? 26 : 0;
    const bottomExtra = spec.hero ? 4 : LABEL_BLOCK;
    return {
      spec,
      diameter,
      cx,
      cy,
      left: cx - diameter / 2 - labelPad,
      top: cy - diameter / 2,
      right: cx + diameter / 2 + labelPad + badgePad,
      bottom: cy + diameter / 2 + bottomExtra,
    };
  });

  const minL = Math.min(...measured.map((item) => item.left));
  const minT = Math.min(...measured.map((item) => item.top));
  const maxR = Math.max(...measured.map((item) => item.right));
  const maxB = Math.max(...measured.map((item) => item.bottom));
  const boxW = Math.max(1, maxR - minL);
  const boxH = Math.max(1, maxB - minT);
  const scale = Math.min(1, (width - 6) / boxW, (height - 6) / boxH);
  const midX = (minL + maxR) / 2;
  const midY = (minT + maxB) / 2;

  return measured.map((item) => {
    const diameter = Math.max(44, item.diameter * scale);
    const cx = width / 2 + (item.cx - midX) * scale;
    const cy = height / 2 + (item.cy - midY) * scale;
    return {
      ...item.spec,
      diameter,
      left: cx - diameter / 2,
      top: cy - diameter / 2,
    };
  });
}
