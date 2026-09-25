import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MATCH_MOODS, MATCH_ROUNDS, MATCH_SECONDS, isMatchMood, matchMoodLabel, type MatchMood } from '@/lib/matchMoods';
import { joinMatchQueue, leaveMatchQueue, listenMatch, saveMatchMood, tryPair } from '@/lib/matching';
import { night } from '@/theme';

function clock(seconds: number): string {
  const safe = Math.max(0, seconds);
  return `0:${String(safe).padStart(2, '0')}`;
}

export function MatchButton({ uid }: { uid: string | null }) {
  const router = useRouter();
  const [mood, setMood] = useState<MatchMood | null>(null);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'matched'>('idle');
  const [peer, setPeer] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(MATCH_SECONDS);
  const [round, setRound] = useState(0);
  const [notice, setNotice] = useState('');
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<MatchMood | null>(null);

  useEffect(() => {
    if (!uid) return;
    return listenMatch(uid, (state) => {
      setMood(state.mood);
      setStatus(state.matchStatus);
      setPeer(state.matchedWith);
      if (state.matchStatus === 'matched') setNotice('');
    });
  }, [uid]);

  useEffect(() => {
    if (status !== 'waiting') return;
    if (seconds <= 0) {
      if (round >= MATCH_ROUNDS) {
        setNotice('Şu an aynı ruh halinde kimse yok, tekrar dene.');
        if (uid) void leaveMatchQueue(uid);
        setRound(0);
        return;
      }
      setRound((value) => value + 1);
      setSeconds(MATCH_SECONDS);
      setNotice('Aynı ruh halinde kimse yok. Bir tur daha.');
      return;
    }
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    if (uid && mood && seconds % 3 === 0) void tryPair(uid, mood);
    return () => clearTimeout(timer);
  }, [mood, round, seconds, status, uid]);

  const start = async (next: MatchMood) => {
    if (!uid) {
      router.push('/giris');
      return;
    }
    if (status === 'matched') return;
    setNotice('');
    setPicking(false);
    setRound(1);
    setSeconds(MATCH_SECONDS);
    await saveMatchMood(uid, next);
    const result = await joinMatchQueue(uid, next);
    if (!result.ok) setNotice(result.message);
  };

  const cancel = () => {
    if (!uid || status === 'matched') return;
    setRound(0);
    setSeconds(MATCH_SECONDS);
    setNotice('');
    void leaveMatchQueue(uid);
  };

  return (
    <View style={styles.wrap}>
      {status === 'matched' && peer ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Eşleştin</Text>
          <Text style={styles.cardBody}>{matchMoodLabel(mood)} · aynı ruh hali</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/sohbet/${encodeURIComponent(peer)}`)} style={styles.go}>
            <Text style={styles.goLabel}>Sohbete geç</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status === 'waiting' ? 'Eşleşmeyi iptal et' : 'Eşleş'}
        onPress={() => {
          if (!uid) {
            router.push('/giris');
            return;
          }
          if (status === 'waiting') {
            cancel();
            return;
          }
          if (status === 'matched') return;
          // Her zaman ruh hali seçimini aç (kullanıcı o anki ruh halini seçip eşleşsin)
          setPicking((prev) => !prev);
        }}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>{status === 'waiting' ? `Eşleşiyor ${clock(seconds)}` : 'Eşleş'}</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {picking && status !== 'waiting' ? (
        <View style={styles.pickerBox}>
          <Text style={styles.pickerTitle}>Hangi ruh halindesin?</Text>
          <View style={styles.moods}>
            {MATCH_MOODS.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                onPress={() => {
                  setDraft(option.value);
                  void start(option.value);
                }}
                style={[styles.mood, (draft === option.value || mood === option.value) && styles.moodOn]}
              >
                <Text style={[styles.moodLabel, (draft === option.value || mood === option.value) && styles.moodLabelOn]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  button: {
    backgroundColor: night.fill,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  buttonLabel: { color: '#FFFFFF', fontWeight: '700' },
  notice: { color: night.muted, fontSize: 13, textAlign: 'center' },
  card: {
    backgroundColor: '#14202C',
    borderRadius: 16,
    padding: 12,
    gap: 6,
    alignItems: 'center',
  },
  cardTitle: { color: night.text, fontWeight: '700' },
  cardBody: { color: night.muted, fontSize: 13 },
  go: { backgroundColor: night.fill, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  goLabel: { color: '#FFFFFF', fontWeight: '700' },
  moods: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  pickerBox: {
    backgroundColor: '#101A26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(120, 180, 230, 0.3)',
    padding: 12,
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  pickerTitle: { color: night.muted, fontSize: 13, fontWeight: '600' },
  mood: { borderWidth: 1, borderColor: night.glassLine, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  moodOn: { backgroundColor: '#3B8CFF', borderColor: '#3B8CFF' },
  moodLabel: { color: night.text, fontSize: 13 },
  moodLabelOn: { color: '#FFFFFF', fontWeight: '700' },
});
