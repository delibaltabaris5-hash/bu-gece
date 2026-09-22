import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nudgeAtmospherePlayback } from '@/hooks/useAtmosphere';
import { ATMOSPHERE_VOLUME_STEP } from '@/lib/atmosphere';
import { useAppStore } from '@/store/useAppStore';
import { fontFamily, night } from '@/theme';

export function AtmosphereControl({ includeSafeArea = true }: { includeSafeArea?: boolean }) {
  const insets = useSafeAreaInsets();
  const volume = useAppStore((state) => state.atmosphereVolume);
  const setAtmosphereVolume = useAppStore((state) => state.setAtmosphereVolume);
  const atMin = volume <= 0;
  const atMax = volume >= 1;

  const adjust = (delta: number) => {
    setAtmosphereVolume(volume + delta);
    nudgeAtmospherePlayback();
  };

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: includeSafeArea ? Math.max(insets.bottom, 8) : 8 },
      ]}
    >
      <View style={styles.mark}>
        <Waveform />
      </View>
      <Text style={styles.title}>Atmosfer</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Müziği kıs"
        accessibilityState={{ disabled: atMin }}
        onPress={() => adjust(-ATMOSPHERE_VOLUME_STEP)}
        style={({ pressed }) => [styles.button, atMin && styles.buttonDim, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
          Müziği kıs
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Müziği yükselt"
        accessibilityState={{ disabled: atMax }}
        onPress={() => adjust(ATMOSPHERE_VOLUME_STEP)}
        style={({ pressed }) => [styles.button, atMax && styles.buttonDim, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
          Müziği yükselt
        </Text>
      </Pressable>
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
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: night.bg,
    borderTopWidth: 1,
    borderTopColor: night.glassLine,
  },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  title: {
    color: night.muted,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fontFamily.sans,
    width: 58,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: 'rgba(20, 48, 82, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(130, 190, 240, 0.45)',
  },
  buttonDim: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
  },
  buttonLabel: {
    color: night.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fontFamily.sans,
    textAlign: 'center',
  },
});
