import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ROOMS } from '@/data/rooms';
import { GENDERS, MOODS } from '@/labels';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme';
import type { Gender, Mood, RoomId } from '@/types';
import { PrimaryButton, Screen, SecondaryButton } from '@/components/ui';

type Step = 'welcome' | 'gender' | 'room' | 'mood';

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const [step, setStep] = useState<Step>('welcome');
  const [gender, setGender] = useState<Gender | null>(null);
  const [roomId, setRoomId] = useState<RoomId | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);

  const finish = (nextMood: Mood | null) => {
    if (!gender || !roomId) return;
    completeOnboarding({ gender, roomId, mood: nextMood });
    router.replace('/(tabs)');
  };

  return (
    <Screen bottom={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'welcome' ? (
          <View style={styles.block}>
            <Text style={styles.kicker}>İlgi kulüpleri</Text>
            <Text style={styles.title}>Bu Gece</Text>
            <Text style={styles.body}>
              Felsefeden mitolojiye on oda. Ana ekranda odalar ışıltılı baloncuklar olarak durur.
              Odalar konu içindir.
            </Text>
            <PrimaryButton label="Başla" onPress={() => setStep('gender')} />
          </View>
        ) : null}

        {step === 'gender' ? (
          <View style={styles.block}>
            <Text style={styles.kicker}>1 / 3</Text>
            <Text style={styles.title}>Odada nasıl görüneceksin?</Text>
            <Text style={styles.body}>
              Ücretsiz planda yalnızca bir simge ve geçici numara görünür. Fotoğraf yok.
            </Text>
            <View style={styles.choiceCol}>
              {GENDERS.map((option) => {
                const selected = gender === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setGender(option.value)}
                    style={[styles.choice, selected && styles.choiceOn]}
                  >
                    <Text style={styles.choiceTitle}>{option.label}</Text>
                    <Text style={styles.choiceHint}>{option.hint}</Text>
                  </Pressable>
                );
              })}
            </View>
            <PrimaryButton
              label="Odayı seç"
              disabled={!gender}
              onPress={() => setStep('room')}
            />
          </View>
        ) : null}

        {step === 'room' ? (
          <View style={styles.block}>
            <Text style={styles.kicker}>2 / 3</Text>
            <Text style={styles.title}>Bu gece hangi oda?</Text>
            <Text style={styles.body}>Diğer odalara da girebilirsin. Bu seçim ev odanı belirler.</Text>
            <View style={styles.grid}>
              {ROOMS.map((room) => {
                const selected = roomId === room.id;
                return (
                  <Pressable
                    key={room.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setRoomId(room.id)}
                    style={[styles.room, selected && styles.choiceOn]}
                  >
                    <Text style={styles.mark}>{room.mark}</Text>
                    <Text style={styles.choiceTitle}>{room.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <PrimaryButton
              label="Tempoya geç"
              disabled={!roomId}
              onPress={() => setStep('mood')}
            />
            <SecondaryButton label="Geri" onPress={() => setStep('gender')} />
          </View>
        ) : null}

        {step === 'mood' ? (
          <View style={styles.block}>
            <Text style={styles.kicker}>3 / 3</Text>
            <Text style={styles.title}>Bu gecenin temposu</Text>
            <Text style={styles.body}>
              İstersen boş bırak. Tempo bu cihazda bir not olarak kalır.
            </Text>
            <View style={styles.wrap}>
              {MOODS.map((option) => {
                const selected = mood === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setMood(selected ? null : option.value)}
                    style={[styles.chip, selected && styles.choiceOn]}
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelOn]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <PrimaryButton label="Bu geceye geç" onPress={() => finish(mood)} />
            <SecondaryButton label="Temposuz devam et" onPress={() => finish(null)} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    paddingBottom: 48,
    gap: space.lg,
  },
  block: {
    gap: space.md,
  },
  kicker: {
    color: colors.gold,
    letterSpacing: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  choiceCol: {
    gap: 10,
  },
  choice: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: space.md,
    gap: 4,
  },
  choiceOn: {
    borderColor: colors.gold,
    backgroundColor: colors.cardOn,
  },
  choiceTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  choiceHint: {
    color: colors.muted,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  room: {
    width: '48%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: space.md,
    gap: 6,
    minHeight: 88,
  },
  mark: {
    color: colors.gold,
    fontSize: 18,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.elevated,
  },
  chipLabel: {
    color: colors.muted,
    fontSize: 15,
  },
  chipLabelOn: {
    color: colors.goldSoft,
    fontWeight: '700',
  },
});
