import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Crescent } from '@/components/Crescent';
import { InterestBubble } from '@/components/InterestBubble';
import { Screen } from '@/components/ui';
import { BUBBLE_ART } from '@/data/bubbleArt';
import { placeConstellation, type HomeScope } from '@/data/constellation';
import { getRoom } from '@/data/rooms';
import { quotaLabel, quotaRatio } from '@/lib/quota';
import { useAppStore } from '@/store/useAppStore';
import { fontFamily, night } from '@/theme';

const STARS = Array.from({ length: 46 }, (_, index) => {
  const seed = (index + 1) * 92821;
  return {
    left: (seed % 1000) / 10,
    top: ((seed * 13) % 1000) / 10,
    size: index % 7 === 0 ? 2.4 : 1.4,
    opacity: 0.22 + (index % 5) * 0.1,
  };
});

export default function HomeScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isPro = useAppStore((state) => state.isPro);
  const remaining = useAppStore((state) => state.freeMessagesRemaining);
  const roomId = useAppStore((state) => state.roomId);
  const [scope, setScope] = useState<HomeScope>('yakindakiler');
  const [field, setField] = useState({ width: 0, height: 0 });

  const placed = useMemo(
    () => placeConstellation(field.width, field.height),
    [field.width, field.height],
  );
  const titleSize = Math.min(46, Math.max(34, Math.min(windowWidth, 480) * 0.108));
  const ratio = quotaRatio(remaining, isPro);
  const atmosphereRoom = roomId ?? 'felsefe';

  return (
    <Screen backgroundColor={night.bg} bottom={false}>
      <View style={styles.sky}>
        {STARS.map((star, index) => (
          <View
            key={index}
            pointerEvents="none"
            style={[
              styles.star,
              {
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
              },
            ]}
          />
        ))}

        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { fontSize: titleSize, lineHeight: titleSize + 4 },
            ]}
          >
            Bu Gece
          </Text>
          <Crescent size={Math.max(22, titleSize * 0.46)} cutoutColor={night.bg} />
        </View>

        <View accessibilityRole="tablist" style={styles.segment}>
          <ScopeTab
            label="Yakındakiler"
            selected={scope === 'yakindakiler'}
            onPress={() => setScope('yakindakiler')}
          />
          <ScopeTab
            label="Genel"
            selected={scope === 'genel'}
            onPress={() => setScope('genel')}
          />
        </View>

        <View
          style={styles.field}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setField((current) =>
              current.width === width && current.height === height ? current : { width, height },
            );
          }}
        >
          {placed.map((bubble) => {
            const room = getRoom(bubble.id);
            const distance =
              scope === 'yakindakiler' && bubble.distanceKm
                ? `${bubble.distanceKm.toFixed(1)} km`
                : null;
            return (
              <InterestBubble
                key={bubble.id}
                name={room?.name ?? bubble.id}
                source={BUBBLE_ART[bubble.id]}
                diameter={bubble.diameter}
                left={bubble.left}
                top={bubble.top}
                hero={bubble.hero}
                distanceLabel={distance}
                onPress={() => router.push(`/oda/${bubble.id}`)}
              />
            );
          })}
        </View>

        <View style={styles.quota}>
          <View style={styles.quotaCopy}>
            <Text style={styles.quotaText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
              {quotaLabel(remaining, isPro)}
            </Text>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Ücretsiz mesaj hakkı"
              accessibilityValue={{
                min: 0,
                max: 2,
                now: isPro ? 2 : Math.max(0, remaining),
              }}
              style={styles.progressTrack}
            >
              <View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]} />
            </View>
          </View>
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atmosfer, ses sohbet odasında"
            onPress={() => router.push(`/oda/${atmosphereRoom}`)}
            style={styles.atmosphere}
          >
            <View style={styles.waveWrap}>
              <Waveform />
            </View>
            <View style={styles.atmosphereCopy}>
              <Text style={styles.atmosphereTitle}>Atmosfer</Text>
              <Text style={styles.atmosphereSub} numberOfLines={1}>
                Yumuşak döngü · Sesli
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function ScopeTab({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.scope, selected && styles.scopeOn]}
    >
      <Text style={[styles.scopeLabel, selected && styles.scopeLabelOn]}>{label}</Text>
    </Pressable>
  );
}

function Waveform() {
  const heights = [7, 13, 17, 11, 6];
  return (
    <View style={styles.wave}>
      {heights.map((height, index) => (
        <View key={index} style={[styles.waveBar, { height }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sky: {
    flex: 1,
    backgroundColor: night.bg,
  },
  star: {
    position: 'absolute',
    borderRadius: 2,
    backgroundColor: '#D5E7F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  title: {
    color: night.text,
    fontFamily: fontFamily.serif,
    fontWeight: '600',
    letterSpacing: 0.2,
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
  segment: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 3,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(130, 196, 255, 0.55)',
    backgroundColor: 'rgba(8, 18, 34, 0.72)',
    elevation: 6,
    shadowColor: night.glow,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  scope: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeOn: {
    backgroundColor: night.segment,
    elevation: 4,
    shadowColor: night.glow,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  scopeLabel: {
    color: '#D7E6F4',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.sans,
  },
  scopeLabelOn: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  field: {
    flex: 1,
    marginTop: 4,
    position: 'relative',
  },
  quota: {
    marginHorizontal: 12,
    marginBottom: 10,
    minHeight: 68,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: night.glassLine,
    backgroundColor: night.glass,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    elevation: 4,
    shadowColor: '#16385C',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  quotaCopy: {
    flex: 1,
    gap: 8,
    paddingVertical: 10,
    paddingRight: 8,
  },
  quotaText: {
    color: night.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fontFamily.sans,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: night.track,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: night.fill,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 12,
    backgroundColor: 'rgba(130, 180, 220, 0.35)',
  },
  atmosphere: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 6,
    maxWidth: 168,
  },
  waveWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 44, 76, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(130, 190, 240, 0.4)',
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
  atmosphereCopy: {
    flexShrink: 1,
    gap: 1,
  },
  atmosphereTitle: {
    color: night.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fontFamily.sans,
  },
  atmosphereSub: {
    color: night.muted,
    fontSize: 10,
    fontFamily: fontFamily.sans,
  },
});
