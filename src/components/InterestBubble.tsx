import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ImageSourcePropType } from 'react-native';

import { fontFamily, night } from '@/theme';

export function InterestBubble({
  name,
  source,
  diameter,
  left,
  top,
  hero = false,
  distanceLabel,
  onPress,
}: {
  name: string;
  source: ImageSourcePropType;
  diameter: number;
  left: number;
  top: number;
  hero?: boolean;
  distanceLabel?: string | null;
  onPress: () => void;
}) {
  const ring = Math.max(2, Math.round(diameter * (hero ? 0.028 : 0.034)));
  const halo = Math.round(diameter * (hero ? 0.22 : 0.16));
  const labelSize = hero
    ? Math.max(15, Math.round(diameter * 0.15))
    : Math.max(11, Math.min(14, Math.round(diameter * 0.2)));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={distanceLabel ? `${name}, ${distanceLabel}` : `${name} odası`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.hit,
        {
          left,
          top,
          width: diameter,
          height: diameter + (hero ? 0 : 20),
          minWidth: 44,
          minHeight: 44,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: diameter + halo,
            height: diameter + halo,
            borderRadius: (diameter + halo) / 2,
            left: -halo / 2,
            top: -halo / 2,
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            borderWidth: ring,
            elevation: hero ? 16 : 10,
          },
        ]}
      >
        <Image
          source={source}
          resizeMode="cover"
          style={{ width: diameter - ring * 2, height: diameter - ring * 2, borderRadius: diameter / 2 }}
        />
        {hero ? (
          <Text
            style={[
              styles.heroLabel,
              { fontSize: labelSize, bottom: Math.max(8, diameter * 0.08) },
            ]}
          >
            {name}
          </Text>
        ) : null}
      </View>
      {distanceLabel ? (
        <View style={[styles.badge, { top: diameter * 0.38, right: -6 }]}>
          <Text style={styles.badgeText}>{distanceLabel}</Text>
        </View>
      ) : null}
      {hero ? null : (
        <Text style={[styles.label, { fontSize: labelSize }]} numberOfLines={1}>
          {name}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
    alignItems: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: 'rgba(61, 158, 255, 0.16)',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderColor: night.ring,
    backgroundColor: '#061018',
    shadowColor: night.glow,
    shadowOpacity: 0.95,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({
      android: { elevation: 12 },
      default: {},
    }),
  },
  heroLabel: {
    position: 'absolute',
    left: 8,
    right: 8,
    textAlign: 'center',
    color: night.text,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  label: {
    marginTop: 3,
    color: night.text,
    fontFamily: fontFamily.serif,
    textAlign: 'center',
    width: 92,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  badge: {
    position: 'absolute',
    backgroundColor: 'rgba(12, 36, 64, 0.94)',
    borderColor: '#67B4EA',
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 7,
    minHeight: 22,
    justifyContent: 'center',
    elevation: 8,
    shadowColor: night.glow,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeText: {
    color: '#F4F8FF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fontFamily.sans,
  },
});
