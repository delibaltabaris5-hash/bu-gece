import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme';

const ROWS = [
  {
    title: 'Ücretsiz',
    body: 'Cinsiyet simgesi, geçici numara ve 1–2 oda mesajı. Doğrudan mesaj kapalı.',
  },
  {
    title: 'Pro',
    body: 'Sabit takma ad, kısa tanıtım ve odadaki bir kişiye doğrudan mesaj.',
  },
];

export default function ProScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPro = useAppStore((state) => state.isPro);
  const proBusy = useAppStore((state) => state.proBusy);
  const unlockPro = useAppStore((state) => state.unlockPro);
  const revokePro = useAppStore((state) => state.revokePro);
  const [note, setNote] = useState('');

  const buy = async () => {
    const ok = await unlockPro();
    setNote(ok ? 'Pro bu cihazda açıldı.' : 'Kilit açılmadı.');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={() => router.back()}>
        <Text style={styles.back}>Kapat</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>Pro</Text>
        <Text style={styles.title}>Sabit ad ve doğrudan mesaj</Text>
        <Text style={styles.body}>
          Konum takibi yok. Pro, odadaki kişilerin sabit adını görmeni ve onlara konu üzerinden yazmanı açar.
        </Text>
        {ROWS.map((row) => (
          <View key={row.title} style={styles.card}>
            <Text style={styles.cardTitle}>{row.title}</Text>
            <Text style={styles.body}>{row.body}</Text>
          </View>
        ))}
        {isPro ? (
          <>
            <Text style={styles.ok}>Pro açık. Profiller ve doğrudan mesaj kullanılabilir.</Text>
            <SecondaryButton
              label="Ücretsiz görünüme dön"
              onPress={() => {
                revokePro();
                setNote('Ücretsiz görünüme döndün.');
              }}
            />
          </>
        ) : (
          <PrimaryButton
            label={proBusy ? 'Açılıyor…' : 'Pro’yu aç'}
            disabled={proBusy}
            onPress={() => {
              void buy();
            }}
          />
        )}
        {note ? <Text style={styles.note}>{note}</Text> : null}
        <Text style={styles.footnote}>
          Google Play Billing bu sürümde bağlı değil. “Pro’yu aç” yerel bir deneme kilididir ve yalnızca bu cihazda durur.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.lg,
  },
  back: {
    color: colors.gold,
    fontWeight: '700',
    fontSize: 16,
  },
  content: {
    gap: space.md,
    paddingTop: space.md,
    paddingBottom: 24,
  },
  kicker: {
    color: colors.gold,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: 6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  ok: {
    color: colors.ok,
    fontSize: 15,
  },
  note: {
    color: colors.goldSoft,
    fontSize: 14,
  },
  footnote: {
    color: colors.faint,
    fontSize: 12,
    lineHeight: 18,
  },
});
