import { StyleSheet, Text, View } from 'react-native';

import { genderLabel } from '@/labels';
import { night } from '@/theme';
import type { Gender } from '@/types';

interface AvatarProps {
  gender: Gender;
  size?: number;
}

export function Avatar({ gender, size = 36 }: AvatarProps) {
  const palette =
    gender === 'kadin'
      ? { bg: '#24344A', ink: '#D5E8F8' }
      : { bg: '#16304C', ink: night.glowBright };

  return (
    <View
      accessibilityLabel={`${genderLabel(gender)} simgesi`}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.bg,
        },
      ]}
    >
      <View
        style={{
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: size,
          backgroundColor: palette.ink,
          marginTop: size * 0.16,
        }}
      />
      <View
        style={{
          width: size * 0.62,
          height: size * 0.38,
          borderTopLeftRadius: size,
          borderTopRightRadius: size,
          backgroundColor: palette.ink,
          marginTop: size * 0.08,
        }}
      />
    </View>
  );
}

export function BotMark({ glyph, size = 36 }: { glyph: string; size?: number }) {
  return (
    <View
      accessibilityLabel="Moderatör"
      style={[
        styles.bot,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
        },
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.42 }]}>{glyph}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  bot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14263A',
    borderWidth: 1,
    borderColor: night.ring,
  },
  glyph: {
    color: night.glowBright,
    fontWeight: '700',
  },
});
