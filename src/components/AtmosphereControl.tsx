import { useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { fontFamily, night } from '@/theme';

export function AtmosphereControl({
  volume,
  onVolume,
}: {
  volume: number;
  onVolume: (value: number) => void;
}) {
  const width = useRef(1);

  const seek = (locationX: number) => {
    if (width.current <= 0) return;
    onVolume(locationX / width.current);
  };

  return (
    <View style={styles.bar}>
      <View style={styles.mark}>
        <Waveform />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Atmosfer</Text>
        <Text style={styles.sub} numberOfLines={1}>
          Yumuşak döngü · kısık
        </Text>
      </View>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel="Atmosfer sesi"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(volume * 100) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') onVolume(volume + 0.08);
          if (event.nativeEvent.actionName === 'decrement') onVolume(volume - 0.08);
        }}
        style={styles.sliderHit}
        onLayout={(event) => {
          width.current = event.nativeEvent.layout.width;
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => seek(event.nativeEvent.locationX)}
        onResponderMove={(event) => seek(event.nativeEvent.locationX)}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(volume * 100)}%` }]} />
        </View>
        <View style={[styles.thumb, { left: `${Math.round(volume * 100)}%` }]} />
      </View>
    </View>
  );
}

function Waveform() {
  const heights = [8, 14, 18, 12, 7];
  return (
    <View style={styles.wave}>
      {heights.map((height, index) => (
        <View key={index} style={[styles.waveBar, { height }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: night.glassLine,
    backgroundColor: night.glass,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 48, 82, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(130, 190, 240, 0.45)',
  },
  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 18,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: night.glowBright,
  },
  copy: {
    width: 108,
    gap: 1,
  },
  title: {
    color: night.text,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fontFamily.sans,
  },
  sub: {
    color: night.muted,
    fontSize: 11,
    fontFamily: fontFamily.sans,
  },
  sliderHit: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: night.track,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: night.fill,
  },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 9,
    backgroundColor: '#EAF4FF',
    elevation: 4,
    shadowColor: night.glow,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({
      android: { elevation: 6 },
      default: {},
    }),
  },
});
