import { StyleSheet, Text, View } from 'react-native';

import { genderLabel } from '@/labels';
import { colors } from '@/theme';
import type { Gender } from '@/types';

interface AvatarProps {
  gender: Gender;
  size?: number;
}

export function Avatar({ gender, size = 36 }: AvatarProps) {
  const palette =
    gender === 'kadin'
      ? { bg: colors.roseBg, ink: colors.rose }
      : { bg: colors.blueBg, ink: colors.blue };

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
    backgroundColor: '#2A2418',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  glyph: {
    color: colors.gold,
    fontWeight: '700',
  },
});
