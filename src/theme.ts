import { Platform } from 'react-native';

export const colors = {
  bg: '#0C1016',
  bgDeep: '#05070C',
  elevated: '#151B24',
  card: '#1B2330',
  cardOn: '#243044',
  line: '#2C3848',
  text: '#F6F1E7',
  muted: '#A79F94',
  faint: '#746D64',
  gold: '#E4B15A',
  goldSoft: '#F3D7A4',
  ink: '#14110C',
  rose: '#E2B4BE',
  roseBg: '#3A242C',
  blue: '#A9C7D8',
  blueBg: '#1C2C38',
  ok: '#9DCFB0',
  warn: '#E0A08C',
};

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
};

/** Midnight / cobalt field used by the locked home mock. */
export const night = {
  bg: '#05070C',
  glow: '#3DA0FF',
  glowBright: '#8FD4FF',
  ring: '#7ED0FF',
  text: '#F4F7FB',
  muted: '#A9B8C9',
  glass: 'rgba(10, 16, 28, 0.78)',
  glassLine: 'rgba(120, 180, 230, 0.42)',
  segment: '#1E5A98',
  track: '#14263A',
  fill: '#3B8CFF',
};

export const fontFamily = {
  serif: Platform.select({
    android: 'serif',
    ios: 'Georgia',
    default: 'Georgia, "Times New Roman", serif',
  }) as string,
  sans: Platform.select({
    android: 'sans-serif',
    ios: 'System',
    default: 'system-ui, sans-serif',
  }) as string,
};
