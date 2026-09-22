import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Starfield } from '@/components/Starfield';
import { PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { ROOMS } from '@/data/rooms';
import { MOODS } from '@/labels';
import { useAppStore } from '@/store/useAppStore';
import { fontFamily, night, space } from '@/theme';
import type { Gender, Mood, RoomId } from '@/types';

type Step = 'gender' | 'room' | 'mood';

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const [step, setStep] = useState<Step>('gender');
  const [gender, setGender] = useState<Gender | null>(null);
  const [roomId, setRoomId] = useState<RoomId | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);

  const finish = (nextMood: Mood | null) => {
    if (!gender || !roomId) return;
    completeOnboarding({ gender, roomId, mood: nextMood });
    router.replace('/(tabs)');
  };

  return (
    <Screen backgroundColor={night.bg} bottom={false}>
      <Starfield />
      <View pointerEvents="none" style={styles.nebula} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'gender' ? (
          <View style={styles.block}>
            <Text style={styles.brand}>Bu Gece</Text>
            <Text style={styles.subtitle}>Odada nasıl görüneceksin?</Text>
            <View style={styles.choiceCol}>
              <GenderCard
                kind="kadin"
                label="Kadın"
                selected={gender === 'kadin'}
                onPress={() => setGender('kadin')}
              />
              <GenderCard
                kind="erkek"
                label="Erkek"
                selected={gender === 'erkek'}
                onPress={() => setGender('erkek')}
              />
            </View>
            <View style={styles.cta}>
              <PrimaryButton label="Devam" disabled={!gender} onPress={() => setStep('room')} />
            </View>
          </View>
        ) : null}

        {step === 'room' ? (
          <View style={styles.block}>
            <Text style={styles.kicker}>2 / 3</Text>
            <Text style={styles.question}>Bu gece hangi oda?</Text>
            <Text style={styles.subtitle}>Diğer odalara da girebilirsin. Bu seçim ev odanı belirler.</Text>
            <View style={styles.grid}>
              {ROOMS.map((room) => {
                const selected = roomId === room.id;
                return (
                  <Pressable
                    key={room.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setRoomId(room.id)}
                    style={[styles.room, selected && styles.cardOn]}
                  >
                    <Text style={styles.mark}>{room.mark}</Text>
                    <Text style={styles.choiceTitle}>{room.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.cta}>
              <PrimaryButton label="Devam" disabled={!roomId} onPress={() => setStep('mood')} />
            </View>
            <SecondaryButton label="Geri" onPress={() => setStep('gender')} />
          </View>
        ) : null}

        {step === 'mood' ? (
          <View style={styles.block}>
            <Text style={styles.kicker}>3 / 3</Text>
            <Text style={styles.question}>Bu gecenin temposu</Text>
            <Text style={styles.subtitle}>İstersen boş bırak. Tempo bu cihazda bir not olarak kalır.</Text>
            <View style={styles.wrap}>
              {MOODS.map((option) => {
                const selected = mood === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setMood(selected ? null : option.value)}
                    style={[styles.chip, selected && styles.cardOn]}
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelOn]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.cta}>
              <PrimaryButton label="Bu geceye geç" onPress={() => finish(mood)} />
            </View>
            <SecondaryButton label="Temposuz devam et" onPress={() => finish(null)} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function GenderCard({
  kind,
  label,
  selected,
  onPress,
}: {
  kind: Gender;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.card, selected && styles.cardOn]}
    >
      <GenderMark kind={kind} />
      <Text style={styles.choiceTitle}>{label}</Text>
    </Pressable>
  );
}

function GenderMark({ kind }: { kind: Gender }) {
  const ink = '#EAF4FF';
  return (
    <View style={[styles.markCircle, kind === 'erkek' && styles.markCircleDeep]}>
      {kind === 'kadin' ? (
        <View style={styles.glyph}>
          <View style={[styles.bodice, { backgroundColor: ink }]} />
          <View style={[styles.skirt, { borderTopColor: ink }]} />
        </View>
      ) : (
        <View style={styles.glyph}>
          <View style={styles.shirtRow}>
            <View style={[styles.sleeve, { backgroundColor: ink }]} />
            <View style={[styles.torso, { backgroundColor: ink }]} />
            <View style={[styles.sleeve, { backgroundColor: ink }]} />
          </View>
          <View style={styles.legRow}>
            <View style={[styles.leg, { backgroundColor: ink }]} />
            <View style={[styles.leg, { backgroundColor: ink }]} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nebula: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    width: 280,
    height: 180,
    borderRadius: 140,
    backgroundColor: 'rgba(36, 92, 180, 0.22)',
  },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: 36,
    paddingBottom: 48,
  },
  block: {
    gap: 16,
  },
  brand: {
    color: night.text,
    fontFamily: fontFamily.serif,
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
    ...Platform.select({ android: { includeFontPadding: false }, default: {} }),
  },
  question: {
    color: night.text,
    fontFamily: fontFamily.serif,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: night.muted,
    fontFamily: fontFamily.sans,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  kicker: {
    color: night.glowBright,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  choiceCol: {
    gap: 12,
    marginTop: 12,
  },
  card: {
    minHeight: 74,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(120, 180, 230, 0.38)',
    backgroundColor: 'rgba(10, 22, 40, 0.78)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardOn: {
    borderColor: night.ring,
    backgroundColor: 'rgba(24, 74, 138, 0.55)',
    shadowColor: night.glow,
    shadowOpacity: 0.85,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  choiceTitle: {
    color: night.text,
    fontFamily: fontFamily.sans,
    fontSize: 20,
    fontWeight: '600',
  },
  markCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(86, 126, 176, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(170, 210, 245, 0.45)',
  },
  markCircleDeep: {
    backgroundColor: 'rgba(28, 78, 148, 0.72)',
    borderColor: 'rgba(127, 196, 255, 0.7)',
  },
  glyph: {
    alignItems: 'center',
  },
  bodice: {
    width: 12,
    height: 7,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  skirt: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  shirtRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  sleeve: {
    width: 5,
    height: 8,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  torso: {
    width: 12,
    height: 11,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  legRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
  },
  leg: {
    width: 6,
    height: 7,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  cta: {
    alignSelf: 'center',
    width: '68%',
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  room: {
    width: '48%',
    flexGrow: 1,
    minHeight: 84,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(120, 180, 230, 0.32)',
    backgroundColor: 'rgba(10, 22, 40, 0.78)',
    padding: 14,
    gap: 6,
  },
  mark: {
    color: night.glowBright,
    fontSize: 18,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(120, 180, 230, 0.38)',
    backgroundColor: 'rgba(10, 22, 40, 0.78)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipLabel: {
    color: night.muted,
    fontFamily: fontFamily.sans,
    fontSize: 15,
  },
  chipLabelOn: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
