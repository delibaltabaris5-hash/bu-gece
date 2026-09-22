import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Crescent } from '@/components/Crescent';
import { InterestBubble } from '@/components/InterestBubble';
import { Screen } from '@/components/ui';
import { BUBBLE_ART } from '@/data/bubbleArt';
import { placeConstellation } from '@/data/constellation';
import { getRoom } from '@/data/rooms';
import { FREE_MESSAGE_QUOTA, quotaLabel, quotaRatio } from '@/lib/quota';
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
  const accountId = useAppStore((state) => state.accountId);
  const remaining = useAppStore((state) => state.freeMessagesRemaining);
  const [field, setField] = useState({ width: 0, height: 0 });

  const placed = useMemo(
    () => placeConstellation(field.width, field.height),
    [field.width, field.height],
  );
  const titleSize = Math.min(46, Math.max(34, Math.min(windowWidth, 480) * 0.108));
  const signedIn = Boolean(accountId);
  const ratio = signedIn ? quotaRatio(remaining, isPro) : 0;

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
            return (
              <InterestBubble
                key={bubble.id}
                name={room?.name ?? bubble.id}
                source={BUBBLE_ART[bubble.id]}
                diameter={bubble.diameter}
                left={bubble.left}
                top={bubble.top}
                hero={bubble.hero}
                onPress={() => router.push(`/oda/${bubble.id}`)}
              />
            );
          })}
        </View>

        <View style={styles.quota}>
          <View style={styles.quotaCopy}>
            <Text style={styles.quotaText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
              {quotaLabel(remaining, isPro, signedIn)}
            </Text>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Ücretsiz mesaj hakkı"
              accessibilityValue={{
                min: 0,
                max: FREE_MESSAGE_QUOTA,
                now: !signedIn ? 0 : isPro ? FREE_MESSAGE_QUOTA : Math.max(0, Math.min(FREE_MESSAGE_QUOTA, remaining)),
              }}
              style={styles.progressTrack}
            >
              <View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]} />
            </View>
          </View>
        </View>
      </View>
    </Screen>
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
});
