import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProfileBubble, SilhouetteBubble } from '@/components/ProfileBubble';
import { Starfield } from '@/components/Starfield';
import { PrimaryButton, Screen } from '@/components/ui';
import { memberFacingName, MEMBERS, membersWithMood } from '@/data/members';
import { placeMemberSky, placeMoodNetwork } from '@/data/memberSky';
import { touchPresence, useLivePresence } from '@/hooks/usePresence';
import { labelOf, MOODS } from '@/labels';
import { presenceFacingName, type LivePerson } from '@/lib/presence';
import { quotaLabel } from '@/lib/quota';
import { useAppStore } from '@/store/useAppStore';
import { fontFamily, night } from '@/theme';
import type { Mood } from '@/types';

const MATCH_WAIT_SECONDS = 12;

type Segment = 'genel' | 'ruh';
type Phase = 'ask' | 'search' | 'found';
type SkyFace = { id: string; label: string };

function facesFromLive(people: LivePerson[], isPro: boolean): SkyFace[] {
  return people.map((person) => ({
    id: person.accountId,
    label: presenceFacingName(person.displayNick, isPro),
  }));
}

export default function SohbetlerScreen() {
  const router = useRouter();
  const isPro = useAppStore((state) => state.isPro);
  const accountId = useAppStore((state) => state.accountId);
  const remaining = useAppStore((state) => state.freeMessagesRemaining);
  const storedMood = useAppStore((state) => state.mood);
  const setMood = useAppStore((state) => state.setMood);
  const [segment, setSegment] = useState<Segment>('genel');
  const [draftMood, setDraftMood] = useState<Mood | null>(storedMood);
  const [phase, setPhase] = useState<Phase>('ask');
  const [secondsLeft, setSecondsLeft] = useState(MATCH_WAIT_SECONDS);
  const [fieldWidth, setFieldWidth] = useState(0);
  const [netBox, setNetBox] = useState({ width: 0, height: 0 });
  const livePeople = useLivePresence();

  useFocusEffect(
    useCallback(() => {
      touchPresence();
    }, []),
  );

  useEffect(() => {
    if (segment === 'genel') touchPresence();
  }, [segment]);

  const genelFaces = useMemo<SkyFace[]>(() => {
    if (livePeople && livePeople.length > 0) return facesFromLive(livePeople, isPro);
    return MEMBERS.map((member) => ({ id: member.id, label: memberFacingName(member, isPro) }));
  }, [isPro, livePeople]);
  const sky = useMemo(
    () => placeMemberSky(genelFaces.map((face) => face.id), fieldWidth),
    [fieldWidth, genelFaces],
  );
  const matches = useMemo<SkyFace[]>(() => {
    if (!draftMood) return [];
    const sameMood = (livePeople ?? []).filter((person) => person.mood === draftMood);
    if (sameMood.length > 0) return facesFromLive(sameMood, isPro);
    return membersWithMood(draftMood).map((member) => ({
      id: member.id,
      label: memberFacingName(member, isPro),
    }));
  }, [draftMood, isPro, livePeople]);
  const network = useMemo(
    () => placeMoodNetwork(matches.length, netBox.width, netBox.height),
    [matches.length, netBox.width, netBox.height],
  );

  useEffect(() => {
    if (phase !== 'search') return;
    if (secondsLeft <= 0) {
      setPhase('found');
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft]);

  const openMember = (id: string) => {
    router.push(`/sohbet/${id}`);
  };

  const beginSearch = () => {
    if (!draftMood) return;
    setMood(draftMood);
    setSecondsLeft(MATCH_WAIT_SECONDS);
    setPhase('search');
  };

  return (
    <Screen backgroundColor={night.bg} bottom={false}>
      <View style={styles.sky}>
        <Starfield />
        <Text style={styles.title}>Sohbetler</Text>
        <View accessibilityRole="tablist" style={styles.segment}>
          <ScopeTab label="Genel" selected={segment === 'genel'} onPress={() => setSegment('genel')} />
          <ScopeTab label="Ruh Hali" selected={segment === 'ruh'} onPress={() => setSegment('ruh')} />
        </View>

        {segment === 'genel' ? (
          <>
            <Text style={styles.quota}>{quotaLabel(remaining, isPro, Boolean(accountId))}</Text>
            {livePeople && livePeople.length > 0 ? (
              <Text style={styles.liveCaption}>Canlı · {livePeople.length} kişi</Text>
            ) : null}
            {!accountId ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/giris')} style={styles.payStrip}>
                <Text style={styles.payStripText}>Yazmak için üye girişi</Text>
                <Text style={styles.payStripCta}>Giriş yap</Text>
              </Pressable>
            ) : !isPro && remaining <= 0 ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/pro')} style={styles.payStrip}>
                <Text style={styles.payStripText}>Ücretsiz mesaj hakkın doldu</Text>
                <Text style={styles.payStripCta}>Pro’yu aç</Text>
              </Pressable>
            ) : null}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[styles.field, { height: Math.max(sky.height, 280) }]}
                onLayout={(event) => {
                  const width = event.nativeEvent.layout.width;
                  setFieldWidth((current) => (current === width ? current : width));
                }}
              >
                {sky.bubbles.map((bubble) => {
                  const face = genelFaces.find((item) => item.id === bubble.id);
                  if (!face) return null;
                  return (
                    <ProfileBubble
                      key={bubble.id}
                      label={face.label}
                      glyph={bubble.glyph}
                      diameter={bubble.diameter}
                      left={bubble.left}
                      top={bubble.top}
                      onPress={() => openMember(face.id)}
                    />
                  );
                })}
              </View>
            </ScrollView>
          </>
        ) : (
          <View style={styles.ruh}>
            {phase === 'ask' ? (
              <ScrollView contentContainerStyle={styles.ask}>
                <Text style={styles.question}>Bugün nasılsın?</Text>
                <Text style={styles.lead}>
                  Bir ruh hali seç. Aynı tempodakiler kısa bir aramadan sonra belirir. Konum yok.
                </Text>
                <View style={styles.moods}>
                  {MOODS.map((option) => {
                    const selected = draftMood === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setDraftMood(option.value)}
                        style={[styles.mood, selected && styles.moodOn]}
                      >
                        <Text style={[styles.moodLabel, selected && styles.moodLabelOn]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.cta}>
                  <PrimaryButton label="Eşleşmeyi başlat" disabled={!draftMood} onPress={beginSearch} />
                </View>
              </ScrollView>
            ) : null}

            {phase === 'search' ? <SearchSky secondsLeft={secondsLeft} mood={draftMood} /> : null}

            {phase === 'found' && draftMood ? (
              <View style={styles.found}>
                <View style={styles.tempoRow}>
                  <Text style={styles.tempoText} numberOfLines={1}>
                    Bugünün temposu · {labelOf(MOODS, draftMood)}
                  </Text>
                  <Pressable accessibilityRole="button" onPress={() => setPhase('ask')}>
                    <Text style={styles.change}>değiştir</Text>
                  </Pressable>
                </View>
                <Text style={styles.same}>Aynı tempodakiler</Text>
                <View
                  style={styles.network}
                  onLayout={(event) => {
                    const { width, height } = event.nativeEvent.layout;
                    setNetBox((current) =>
                      current.width === width && current.height === height ? current : { width, height },
                    );
                  }}
                >
                  {network.slice(1).map((node, index, sats) => {
                    const center = network[0];
                    const next = sats[(index + 1) % sats.length];
                    if (!center || !next) return null;
                    return (
                      <View key={`links-${node.index}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
                        <LinkLine x1={center.cx} y1={center.cy} x2={node.cx} y2={node.cy} />
                        <LinkLine x1={node.cx} y1={node.cy} x2={next.cx} y2={next.cy} />
                      </View>
                    );
                  })}
                  {network.map((node) => {
                    const face = matches[node.index];
                    if (!face) return null;
                    return (
                      <Pressable
                        key={face.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${face.label}, mesaj yaz`}
                        onPress={() => openMember(face.id)}
                        style={[
                          styles.node,
                          {
                            width: node.diameter,
                            height: node.diameter,
                            left: node.cx - node.diameter / 2,
                            top: node.cy - node.diameter / 2,
                          },
                        ]}
                      >
                        <SilhouetteBubble diameter={node.diameter} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

function SearchSky({ secondsLeft, mood }: { secondsLeft: number; mood: Mood | null }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

  return (
    <View style={styles.search}>
      <Animated.View style={[styles.searchHalo, { opacity, transform: [{ scale }] }]} />
      <View style={styles.searchCore}>
        <Text style={styles.searchMark}>✶</Text>
      </View>
      <Text style={styles.searchTitle}>Aranıyor</Text>
      <Text style={styles.countdown}>{secondsLeft}</Text>
      <Text style={styles.searchHint}>
        {mood ? `${labelOf(MOODS, mood)} ruh hali` : 'Ruh hali'} · {secondsLeft} saniye
      </Text>
    </View>
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

function LinkLine({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angle = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx - length / 2,
        top: cy - 1,
        width: length,
        height: 2,
        borderRadius: 1,
        backgroundColor: '#8FD4FF',
        opacity: 0.9,
        transform: [{ rotate: angle }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  sky: {
    flex: 1,
    backgroundColor: night.bg,
  },
  title: {
    color: night.text,
    fontFamily: fontFamily.serif,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: 2,
    ...Platform.select({ android: { includeFontPadding: false }, default: {} }),
  },
  segment: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 3,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(130, 196, 255, 0.55)',
    backgroundColor: 'rgba(8, 18, 34, 0.72)',
    shadowColor: night.glow,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  scope: {
    minHeight: 40,
    minWidth: 108,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeOn: {
    backgroundColor: night.segment,
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
  quota: {
    color: night.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: fontFamily.sans,
  },
  liveCaption: {
    color: night.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.8,
    fontFamily: fontFamily.sans,
  },
  payStrip: {
    alignSelf: 'center',
    marginTop: 8,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: night.glassLine,
    backgroundColor: night.glass,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  payStripText: {
    color: night.text,
    fontSize: 12,
    fontWeight: '600',
  },
  payStripCta: {
    color: night.glowBright,
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  field: {
    position: 'relative',
  },
  ruh: {
    flex: 1,
  },
  ask: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 16,
    paddingBottom: 28,
  },
  question: {
    color: night.text,
    fontFamily: fontFamily.serif,
    fontSize: 34,
    lineHeight: 40,
    textAlign: 'center',
    fontWeight: '600',
  },
  lead: {
    color: night.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: fontFamily.sans,
  },
  moods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  mood: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(130, 196, 255, 0.4)',
    backgroundColor: 'rgba(8, 18, 34, 0.72)',
    paddingHorizontal: 16,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodOn: {
    backgroundColor: night.segment,
    borderColor: night.ring,
    shadowColor: night.glow,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  moodLabel: {
    color: '#D7E6F4',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fontFamily.sans,
  },
  moodLabelOn: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cta: {
    alignSelf: 'center',
    width: '78%',
    marginTop: 8,
  },
  search: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchHalo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(61, 160, 255, 0.28)',
  },
  searchCore: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: night.ring,
    backgroundColor: '#061018',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: night.glow,
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  searchMark: {
    color: night.glowBright,
    fontSize: 36,
  },
  searchTitle: {
    color: night.text,
    fontFamily: fontFamily.serif,
    fontSize: 32,
    marginTop: 12,
  },
  countdown: {
    color: '#FFFFFF',
    fontFamily: fontFamily.serif,
    fontSize: 56,
    lineHeight: 62,
    fontWeight: '600',
  },
  searchHint: {
    color: night.muted,
    fontSize: 14,
    fontFamily: fontFamily.sans,
  },
  found: {
    flex: 1,
    paddingTop: 8,
  },
  tempoRow: {
    marginHorizontal: 16,
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: night.glassLine,
    backgroundColor: night.glass,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 8,
  },
  tempoText: {
    flex: 1,
    color: night.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fontFamily.sans,
  },
  change: {
    color: night.glowBright,
    fontSize: 13,
    fontWeight: '700',
  },
  same: {
    color: night.muted,
    fontSize: 13,
    marginLeft: 20,
    marginTop: 10,
    fontFamily: fontFamily.sans,
  },
  network: {
    flex: 1,
    marginHorizontal: 8,
    position: 'relative',
  },
  node: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
