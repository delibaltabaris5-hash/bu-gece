import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { RegisteredUsers } from '@/components/RegisteredUsers';
import { Starfield } from '@/components/Starfield';
import { PrimaryButton, Screen } from '@/components/ui';
import { nudgeAtmospherePlayback } from '@/hooks/useAtmosphere';
import { registerAccount, signInWithGoogle, signInWithPassword, writeSessionAccountId } from '@/lib/accountBook';
import { MATCH_MOODS, isMatchMood, type MatchMood } from '@/lib/matchMoods';
import { saveMatchMood } from '@/lib/matching';
import { FREE_MESSAGE_QUOTA, quotaLabel } from '@/lib/quota';
import { bindSignedInAccount } from '@/lib/secureQuota';
import { useAppStore } from '@/store/useAppStore';
import { fontFamily, night, space } from '@/theme';

const MILKY = Array.from({ length: 72 }, (_, index) => {
  const seed = (index + 3) * 48271;
  return {
    left: 42 + (seed % 580) / 10,
    top: ((seed * 17) % 1000) / 10,
    size: index % 8 === 0 ? 2.2 : 1.15,
    opacity: 0.18 + (index % 7) * 0.08,
  };
});

type Panel = 'home' | 'kayit' | 'giris';

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const accountId = useAppStore((state) => state.accountId);
  const accountEmail = useAppStore((state) => state.accountEmail);
  const onboarded = useAppStore((state) => state.onboarded);
  const authStepDone = useAppStore((state) => state.authStepDone);
  const isPro = useAppStore((state) => state.isPro);
  const remaining = useAppStore((state) => state.freeMessagesRemaining);
  const accountName = useAppStore((state) => state.accountName);
  const signOut = useAppStore((state) => state.signOut);
  const [panel, setPanel] = useState<Panel>('kayit');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mood, setMood] = useState<MatchMood | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const titleSize = Math.min(58, Math.max(46, Math.min(width, 480) * 0.145));

  const leave = (nextOnboarded = onboarded) => {
    if (nextOnboarded) {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
      return;
    }
    router.replace('/onboarding');
  };

  const finish = async (result: Awaited<ReturnType<typeof signInWithPassword>>) => {
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await bindSignedInAccount({
      accountId: result.account.accountId,
      email: result.account.email,
      displayName: result.account.displayName,
      freeMessagesRemaining: result.account.freeMessagesRemaining,
      isPro: result.account.isPro,
    });
    leave(onboarded);
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (panel === 'kayit' && !isMatchMood(mood)) {
        setError('Bir ruh hali seç.');
        return;
      }
      const result =
        panel === 'kayit'
          ? await registerAccount(email, password, displayName, mood ?? '')
          : await signInWithPassword(email, password);
      await finish(result);
    } finally {
      setBusy(false);
    }
  };

  const google = async (profile: { email: string; name: string; idToken: string }) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await signInWithGoogle(profile.email, profile.name, profile.idToken);
      if (result.ok && isMatchMood(mood)) {
        await saveMatchMood(result.account.accountId, mood);
      }
      await finish(result);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await writeSessionAccountId(null);
    signOut();
    setPanel('home');
    setError('');
  };

  return (
    <Screen backgroundColor={night.bg} bottom={false}>
      <Starfield />
      {MILKY.map((star, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={[
            styles.milkyStar,
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
      <View pointerEvents="none" style={styles.galaxy} />
      <View pointerEvents="none" style={styles.galaxySoft} />

      {accountId && panel === 'home' ? (
        <View style={styles.flex}>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Brand titleSize={Math.min(titleSize, 42)} />
            <View style={styles.card}>
              {accountName ? <Text style={styles.emailStrong}>{accountName}</Text> : null}
              <Text style={accountName ? styles.body : styles.emailStrong}>{accountEmail || accountId}</Text>
              <Text style={styles.body}>{isPro ? 'Pro: sınırsız mesaj' : quotaLabel(remaining, false)}</Text>
              <Text style={styles.body}>
                Hak bu hesaba bağlıdır. Aynı e-posta ile yeniden giriş, kayıtlı sayıyı açar.
              </Text>
              <RegisteredUsers />
              <PrimaryButton label="Çıkış yap" onPress={() => void logout()} />
              {authStepDone ? (
                <Pressable accessibilityRole="button" onPress={() => leave()} style={styles.textBtn}>
                  <Text style={styles.textBtnLabel}>Geri</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
          <AtmosphereSlider />
        </View>
      ) : panel === 'home' ? (
        <View style={styles.landing}>
          <View style={styles.landingBody}>
            <Brand titleSize={titleSize} />
            <View style={styles.ruleRow}>
              <View style={styles.rule} />
              <Spark />
              <View style={styles.rule} />
            </View>
            <Text style={styles.subtitle}>Hesabınla devam et.</Text>
            <View style={styles.stack}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kayıt ol"
                onPress={() => {
                  setError('');
                  setPanel('kayit');
                }}
                style={({ pressed }) => [styles.kayit, pressed && styles.pressed]}
              >
                <Image source={require('../../assets/auth-envelope.png')} style={styles.envelope} />
                <Text style={styles.kayitLabel}>Kayıt ol</Text>
              </Pressable>
              <GoogleSignInButton
                disabled={busy}
                onProfile={(profile) => void google(profile)}
                onMessage={setError}
                onNeedEmail={() => setPanel('kayit')}
              />
            </View>
            <Text style={styles.memberLine}>
              Zaten üye misin?{' '}
              <Text
                style={styles.memberLink}
                onPress={() => {
                  setError('');
                  setPanel('giris');
                }}
              >
                Giriş yap.
              </Text>
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {busy ? (
              <Text style={[styles.fine, { color: night.glowBright, marginTop: 8 }]}>
                Giriş yapılıyor, lütfen bekleyin...
              </Text>
            ) : null}
          </View>
          <AtmosphereSlider />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError('');
                setPanel('home');
              }}
              style={styles.textBtn}
            >
              <Text style={styles.textBtnLabel}>Geri</Text>
            </Pressable>
            <Brand titleSize={Math.min(titleSize, 42)} />
            <Text style={styles.formLead}>
              {panel === 'kayit' ? 'Kayıt formu' : 'Giriş formu'}
            </Text>
            <Text style={styles.formLead}>
              {panel === 'kayit'
                ? `Yeni hesap ${FREE_MESSAGE_QUOTA} mesajla açılır.`
                : 'Kayıtlı e-posta kalan mesajı açar.'}
            </Text>
            <View style={styles.card}>
              {panel === 'kayit' ? (
                <>
                  <Text style={styles.fieldLabel}>Ruh hali</Text>
                  <View style={styles.moods}>
                    {MATCH_MOODS.map((option) => {
                      const selected = mood === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setMood(option.value)}
                          style={[styles.mood, selected && styles.moodOn]}
                        >
                          <Text style={[styles.moodLabel, selected && styles.moodLabelOn]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.fieldLabel}>Görünen ad</Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="İsteğe bağlı"
                    placeholderTextColor="rgba(169, 184, 201, 0.7)"
                    style={styles.input}
                    maxLength={32}
                  />
                </>
              ) : null}
              <Text style={styles.fieldLabel}>E-posta</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="ad@posta.com"
                placeholderTextColor="rgba(169, 184, 201, 0.7)"
                style={styles.input}
                textContentType="username"
              />
              <Text style={styles.fieldLabel}>Şifre</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="En az 6 karakter"
                placeholderTextColor="rgba(169, 184, 201, 0.7)"
                style={styles.input}
                textContentType={panel === 'kayit' ? 'newPassword' : 'password'}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton
                label={busy ? 'Bekle…' : panel === 'kayit' ? 'Kayıt ol' : 'Giriş yap'}
                disabled={busy || (panel === 'kayit' && !mood)}
                onPress={() => void submit()}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setError('');
                  setPanel(panel === 'kayit' ? 'giris' : 'kayit');
                }}
                style={styles.textBtn}
              >
                <Text style={styles.memberLine}>
                  {panel === 'kayit' ? 'Zaten üye misin? ' : 'Hesabın yok mu? '}
                  <Text style={styles.memberLink}>{panel === 'kayit' ? 'Giriş yap.' : 'Kayıt ol.'}</Text>
                </Text>
              </Pressable>
              <Text style={styles.fine}>Hesap Firebase’de kalır. Çıkış yalnızca bu oturumu kapatır.</Text>
            </View>
            <GoogleSignInButton
              disabled={busy}
              onProfile={(profile) => void google(profile)}
              onMessage={setError}
              onNeedEmail={() => setPanel('kayit')}
            />
          </ScrollView>
          <AtmosphereSlider />
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

function Brand({ titleSize }: { titleSize: number }) {
  const moon = Math.max(18, titleSize * 0.34);
  return (
    <View style={styles.titleWrap}>
      <Text
        style={[
          styles.title,
          { fontSize: titleSize, lineHeight: titleSize + 4 },
          Platform.OS === 'android' ? { includeFontPadding: false } : null,
        ]}
      >
        Bu Gece
      </Text>
      <Image
        source={require('../../assets/auth-crescent.png')}
        style={{ width: moon, height: moon, marginTop: titleSize * 0.04, marginLeft: 1 }}
      />
    </View>
  );
}

function Spark() {
  return (
    <View style={styles.spark}>
      <View style={styles.sparkV} />
      <View style={styles.sparkH} />
      <View style={styles.sparkD} />
    </View>
  );
}

function AtmosphereSlider() {
  const volume = useAppStore((state) => state.atmosphereVolume);
  const setAtmosphereVolume = useAppStore((state) => state.setAtmosphereVolume);
  const widthRef = useRef(1);
  const setFromX = (x: number) => {
    const track = widthRef.current || 1;
    setAtmosphereVolume(Math.min(1, Math.max(0, x / track)));
    nudgeAtmospherePlayback();
  };

  return (
    <View style={styles.atmosRow}>
      <Text style={styles.atmosLabel}>ATMOSFER</Text>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel="Atmosfer"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(volume * 100) }}
        style={styles.atmosTrack}
        onLayout={(event) => {
          widthRef.current = event.nativeEvent.layout.width;
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => setFromX(event.nativeEvent.locationX)}
        onResponderMove={(event) => setFromX(event.nativeEvent.locationX)}
      >
        <View style={styles.atmosLine} />
        <View pointerEvents="none" style={[styles.atmosThumb, { left: `${volume * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  milkyStar: {
    position: 'absolute',
    borderRadius: 2,
    backgroundColor: '#D6E8FF',
  },
  galaxy: {
    position: 'absolute',
    right: -80,
    top: '12%',
    width: 340,
    height: 520,
    borderRadius: 220,
    backgroundColor: 'rgba(36, 92, 188, 0.28)',
    transform: [{ rotate: '-18deg' }],
    ...(Platform.OS === 'web' ? ({ filter: 'blur(18px)' } as object) : null),
  },
  galaxySoft: {
    position: 'absolute',
    right: -20,
    top: '28%',
    width: 220,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(90, 150, 230, 0.16)',
    transform: [{ rotate: '-24deg' }],
    ...(Platform.OS === 'web' ? ({ filter: 'blur(12px)' } as object) : null),
  },
  landing: {
    flex: 1,
  },
  landingBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 12,
    gap: 18,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    color: '#F7F4EE',
    fontFamily: fontFamily.serif,
    fontWeight: '500',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: -6,
  },
  rule: {
    width: 72,
    height: 1,
    backgroundColor: 'rgba(232, 240, 250, 0.38)',
  },
  spark: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkV: {
    position: 'absolute',
    width: 1.4,
    height: 12,
    borderRadius: 1,
    backgroundColor: '#F4FBFF',
  },
  sparkH: {
    position: 'absolute',
    width: 12,
    height: 1.4,
    borderRadius: 1,
    backgroundColor: '#F4FBFF',
  },
  sparkD: {
    position: 'absolute',
    width: 8,
    height: 1.2,
    borderRadius: 1,
    backgroundColor: '#E7F3FF',
    transform: [{ rotate: '45deg' }],
  },
  subtitle: {
    color: 'rgba(226, 232, 242, 0.88)',
    fontFamily: fontFamily.sans,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: -4,
  },
  stack: {
    gap: 14,
    marginTop: 10,
  },
  kayit: {
    minHeight: 58,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(146, 206, 255, 0.95)',
    backgroundColor: 'rgba(8, 22, 48, 0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#3D9EFF',
    shadowOpacity: 0.95,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    ...(Platform.OS === 'android' ? { elevation: 8 } : null),
  },
  envelope: {
    width: 26,
    height: 20,
  },
  kayitLabel: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sans,
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.9,
  },
  memberLine: {
    color: 'rgba(214, 222, 234, 0.82)',
    fontFamily: fontFamily.sans,
    fontSize: 15,
    textAlign: 'center',
  },
  memberLink: {
    color: '#5EB6FF',
    fontWeight: '700',
  },
  error: {
    color: '#E7B4A8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  atmosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 28,
    paddingTop: 6,
    paddingBottom: 18,
  },
  atmosLabel: {
    color: 'rgba(186, 198, 214, 0.72)',
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.2,
  },
  atmosTrack: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  atmosLine: {
    height: 1,
    backgroundColor: 'rgba(214, 226, 240, 0.55)',
  },
  atmosThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    backgroundColor: '#3D9BFF',
    shadowColor: '#3D9BFF',
    shadowOpacity: 0.95,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  formContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 14,
  },
  formLead: {
    color: night.muted,
    fontFamily: fontFamily.sans,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(120, 180, 230, 0.42)',
    backgroundColor: 'rgba(10, 22, 40, 0.78)',
    padding: 16,
    gap: 12,
  },
  fieldLabel: {
    color: night.glowBright,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fontFamily.sans,
  },
  input: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(130, 196, 255, 0.45)',
    backgroundColor: '#F4F7FB',
    color: '#0C1016',
    fontSize: 16,
    paddingHorizontal: 16,
    fontFamily: fontFamily.sans,
  },
  fine: {
    color: night.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  emailStrong: {
    color: night.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: night.muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  textBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBtnLabel: {
    color: night.glowBright,
    fontSize: 16,
    fontWeight: '700',
  },
  moods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mood: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(120, 180, 230, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  moodOn: {
    backgroundColor: '#3B8CFF',
    borderColor: '#3B8CFF',
  },
  moodLabel: {
    color: night.text,
    fontSize: 14,
  },
  moodLabelOn: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
