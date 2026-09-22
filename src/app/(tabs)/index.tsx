import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PLANS } from '@/data/plans';
import { getRoom } from '@/data/rooms';
import { BUDGETS, DISTANCES, MOODS, labelOf } from '@/labels';
import { matchPlans } from '@/lib/plans';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme';
import type { Budget, Distance, Mood } from '@/types';
import { Pill, PrimaryButton, Screen, SecondaryButton, Segmented } from '@/components/ui';

export default function HomeScreen() {
  const router = useRouter();
  const storedMood = useAppStore((state) => state.mood);
  const roomId = useAppStore((state) => state.roomId);
  const tempNick = useAppStore((state) => state.tempNick);
  const isPro = useAppStore((state) => state.isPro);
  const homeRoom = getRoom(roomId);

  const [mood, setMood] = useState<Mood>(storedMood ?? 'sakin');
  const [budget, setBudget] = useState<Budget>('dusuk');
  const [distance, setDistance] = useState<Distance>('yakin');
  const [index, setIndex] = useState(0);

  const match = useMemo(
    () => matchPlans(PLANS, { mood, budget, distance }),
    [mood, budget, distance],
  );
  const plan = match.plans[index % match.plans.length] ?? PLANS[0];
  const planRoom = getRoom(plan.roomId);

  const shift = (next: () => void) => {
    setIndex(0);
    next();
  };

  return (
    <Screen bottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>İyi geceler</Text>
            <Text style={styles.title}>Bu Gece</Text>
            <Text style={styles.sub}>
              {tempNick || 'Misafir'}
              {homeRoom ? ` · ${homeRoom.name}` : ''}
            </Text>
          </View>
          <Pill label={isPro ? 'Pro' : 'Ücretsiz'} tone={isPro ? 'gold' : 'muted'} />
        </View>

        <Text style={styles.lead}>Tek bir öneri. Takvimin değil, bu akşamın planı.</Text>

        <Segmented
          label="Ruh hali"
          options={MOODS}
          value={mood}
          onChange={(value) => shift(() => setMood(value))}
        />
        <Segmented
          label="Bütçe"
          options={BUDGETS}
          value={budget}
          onChange={(value) => shift(() => setBudget(value))}
        />
        <Segmented
          label="Mesafe"
          options={DISTANCES}
          value={distance}
          onChange={(value) => shift(() => setDistance(value))}
        />

        <View style={styles.card}>
          <Text style={styles.cardKicker}>Örnek plan</Text>
          <Text style={styles.cardTitle}>{plan.title}</Text>
          <Text style={styles.cardBody}>{plan.summary}</Text>
          <Text style={styles.meta}>{plan.place}</Text>
          <Text style={styles.meta}>{plan.when}</Text>
          <Text style={styles.meta}>
            {labelOf(MOODS, plan.mood)} · {labelOf(BUDGETS, plan.budget)} · {labelOf(DISTANCES, plan.distance)}
          </Text>
          {!match.exact ? (
            <Text style={styles.note}>
              Bu süzgeçte birebir plan yok. En yakın gece planını gösteriyorum.
            </Text>
          ) : null}
        </View>

        <PrimaryButton
          label={planRoom ? `${planRoom.name} odasına git` : 'Odaya git'}
          onPress={() => router.push(`/oda/${plan.roomId}`)}
        />
        <SecondaryButton
          label="Başka öneri"
          onPress={() => setIndex((current) => current + 1)}
        />
        <Text style={styles.footnote}>
          Planlar örnek veridir. Konum servisi ve ödeme bu sürümde yoktur.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    gap: space.md,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  kicker: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '700',
  },
  sub: {
    color: colors.muted,
    fontSize: 14,
  },
  lead: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: 8,
  },
  cardKicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  cardBody: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  note: {
    color: colors.goldSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  footnote: {
    color: colors.faint,
    fontSize: 12,
    lineHeight: 18,
  },
});
