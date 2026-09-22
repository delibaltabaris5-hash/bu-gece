import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { GlyphKind } from '@/data/memberSky';
import { fontFamily, night } from '@/theme';

export function ProfileBubble({
  label,
  glyph,
  diameter,
  left,
  top,
  onPress,
}: {
  label: string;
  glyph: GlyphKind;
  diameter: number;
  left: number;
  top: number;
  onPress: () => void;
}) {
  const ring = Math.max(2, Math.round(diameter * 0.035));
  const halo = Math.round(diameter * 0.2);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.hit,
        {
          left,
          top,
          width: diameter,
          height: diameter + 26,
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
          },
        ]}
      >
        <BubbleGlyph kind={glyph} size={diameter * 0.42} />
      </View>
      <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BubbleGlyph({ kind, size }: { kind: GlyphKind; size: number }) {
  const color = night.glowBright;
  if (kind === 'moon') {
    const cover = size * 0.78;
    return (
      <View style={{ width: size * 0.92, height: size }}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: Math.max(2, size * 0.12),
            borderColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: cover,
            height: cover,
            borderRadius: cover / 2,
            backgroundColor: '#061018',
            left: size * 0.28,
            top: size * 0.06,
          }}
        />
      </View>
    );
  }
  if (kind === 'wave') {
    return (
      <View style={{ width: size, gap: size * 0.12 }}>
        {[1, 0.72, 0.48].map((scale) => (
          <View
            key={scale}
            style={{
              alignSelf: 'center',
              width: size * scale,
              height: Math.max(2, size * 0.1),
              borderRadius: size,
              backgroundColor: color,
              opacity: 0.75 + scale * 0.2,
            }}
          />
        ))}
      </View>
    );
  }
  if (kind === 'planet') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size * 0.34,
            borderRadius: size,
            borderWidth: Math.max(1.5, size * 0.06),
            borderColor: color,
            transform: [{ rotate: '-18deg' }],
          }}
        />
        <View
          style={{
            width: size * 0.46,
            height: size * 0.46,
            borderRadius: size,
            backgroundColor: color,
          }}
        />
      </View>
    );
  }
  if (kind === 'knot') {
    const dot = Math.max(4, size * 0.22);
    return (
      <View style={{ width: size * 0.8, height: size * 0.8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {Array.from({ length: 4 }, (_, index) => (
          <View
            key={index}
            style={{ width: dot, height: dot, borderRadius: dot, backgroundColor: color, margin: size * 0.04 }}
          />
        ))}
      </View>
    );
  }
  return (
    <Text style={{ color, fontSize: size * 0.9, lineHeight: size, fontFamily: fontFamily.serif }}>
      {kind === 'spark' ? '✦' : '✶'}
    </Text>
  );
}

export function SilhouetteBubble({ diameter }: { diameter: number }) {
  const ring = Math.max(2, Math.round(diameter * 0.04));
  return (
    <View
      style={[
        styles.ring,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          borderWidth: ring,
        },
      ]}
    >
      <View
        style={{
          width: diameter * 0.28,
          height: diameter * 0.28,
          borderRadius: diameter,
          backgroundColor: '#9EC8EA',
          marginTop: diameter * 0.2,
        }}
      />
      <View
        style={{
          width: diameter * 0.5,
          height: diameter * 0.28,
          borderTopLeftRadius: diameter,
          borderTopRightRadius: diameter,
          backgroundColor: '#9EC8EA',
          marginTop: diameter * 0.06,
        }}
      />
    </View>
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
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({
      android: { elevation: 10 },
      default: {},
    }),
  },
  label: {
    marginTop: 4,
    width: 88,
    textAlign: 'center',
    color: night.text,
    fontSize: 11,
    fontFamily: fontFamily.sans,
  },
});
