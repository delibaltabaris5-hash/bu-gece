export type GlyphKind = 'moon' | 'star' | 'wave' | 'spark' | 'planet' | 'knot';

const GLYPHS: GlyphKind[] = ['moon', 'star', 'wave', 'spark', 'planet', 'knot'];

/** One constellation band. Ten members, then the pattern repeats down the sky. */
const BAND = [
  { x: 0.2, y: 0.13, s: 0.22 },
  { x: 0.76, y: 0.09, s: 0.15 },
  { x: 0.5, y: 0.3, s: 0.19 },
  { x: 0.16, y: 0.44, s: 0.15 },
  { x: 0.84, y: 0.42, s: 0.16 },
  { x: 0.42, y: 0.55, s: 0.14 },
  { x: 0.68, y: 0.64, s: 0.18 },
  { x: 0.2, y: 0.74, s: 0.14 },
  { x: 0.48, y: 0.84, s: 0.16 },
  { x: 0.8, y: 0.8, s: 0.145 },
];

const BAND_HEIGHT = 540;

export type PlacedSky = {
  id: string;
  diameter: number;
  left: number;
  top: number;
  glyph: GlyphKind;
};

export function placeMemberSky(ids: string[], width: number): { bubbles: PlacedSky[]; height: number } {
  if (width <= 0 || ids.length === 0) return { bubbles: [], height: 0 };
  const bands = Math.ceil(ids.length / BAND.length);
  const bubbles = ids.map((id, index) => {
    const spec = BAND[index % BAND.length] ?? BAND[0]!;
    const band = Math.floor(index / BAND.length);
    const diameter = Math.max(54, Math.round(spec.s * width));
    const cx = spec.x * width;
    const cy = band * BAND_HEIGHT + spec.y * BAND_HEIGHT;
    const left = Math.max(8, Math.min(width - diameter - 8, cx - diameter / 2));
    const top = Math.max(6, cy - diameter / 2);
    return {
      id,
      diameter,
      left,
      top,
      glyph: GLYPHS[index % GLYPHS.length] ?? 'star',
    };
  });
  return { bubbles, height: bands * BAND_HEIGHT + 28 };
}

export type NetworkNode = {
  index: number;
  cx: number;
  cy: number;
  diameter: number;
};

export function placeMoodNetwork(count: number, width: number, height: number): NetworkNode[] {
  if (count <= 0 || width <= 0 || height <= 0) return [];
  const cx = width / 2;
  const cy = height / 2;
  const hero = Math.min(92, width * 0.26);
  const sat = Math.min(54, width * 0.15);
  const radius = Math.min(width * 0.34, height * 0.34);
  const nodes: NetworkNode[] = [{ index: 0, cx, cy, diameter: hero }];
  const others = count - 1;
  for (let index = 0; index < others; index += 1) {
    const angle = -Math.PI / 2 + (index / others) * Math.PI * 2;
    nodes.push({
      index: index + 1,
      cx: cx + Math.cos(angle) * radius,
      cy: cy + Math.sin(angle) * radius * 0.92,
      diameter: index % 3 === 0 ? sat + 4 : sat,
    });
  }
  return nodes;
}
