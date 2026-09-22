import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Crescent } from '@/components/Crescent';
import { Starfield } from '@/components/Starfield';
import { PrimaryButton, Screen } from '@/components/ui';
import { registerAccount, signInWithPassword, writeSessionAccountId } from '@/lib/accountBook';
import { FREE_MESSAGE_QUOTA, quotaLabel } from '@/lib/quota';
import { bindSignedInAccount } from '@/lib/secureQuota';
import { useAppStore } from '@/store/useAppStore';
import { fontFamily, night, space } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const accountId = useAppStore((state) => state.accountId);
  const accountEmail = useAppStore((state) => state.accountEmail);
  const onboarded = useAppStore((state) => state.onboarded);
  const authStepDone = useAppStore((state) => state.authStepDone);
  const isPro = useAppStore((state) => state.isPro);
  const remaining = useAppStore((state) => state.freeMessagesRemaining);
  const accountName = useAppStore((state) => state.accountName);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);
  const signOut = useAppStore((state) => state.signOut);
  const [mode, setMode] = useState<'giris' | 'kayit'>('giris');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const leave = (nextOnboarded = onboarded) => {
    if (nextOnboarded) {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
      return;
    }
    router.replace('/onboarding');
  };

  const switchMode = (next: 'giris' | 'kayit') => {
    setMode(next);
    setError('');
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result =
        mode === 'kayit'
          ? await registerAccount(email, password, displayName)
          : await signInWithPassword(email, password);
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
    } finally {
      setBusy(false);
    }
  };

  const guest = () => {
    continueAsGuest();
    leave(onboarded);
  };

  const logout = async () => {
    await writeSessionAccountId(null);
    signOut();
  };

  return (
    <Screen backgroundColor={night.bg} bottom={false}>
      <Starfield />
      <View pointerEvents="none" style={styles.glow} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.kicker}>Bu Gece</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>
              {accountId ? 'Hesabım' : mode === 'kayit' ? 'Kayıt ol' : 'Üye girişi'}
            </Text>
            <Crescent size={28} cutoutColor={night.bg} />
          </View>

          {accountId ? (
            <View style={styles.card}>
              {accountName ? <Text style={styles.email}>{accountName}</Text> : null}
              <Text style={accountName ? styles.body : styles.email}>{accountEmail || accountId}</Text>
              <Text style={styles.body}>
                {isPro ? 'Pro: sınırsız mesaj' : quotaLabel(remaining, false)}
              </Text>
              <Text style={styles.body}>
                Hak bu hesaba bağlıdır. Aynı e-posta ile yeniden giriş, kayıtlı sayıyı açar.
              </Text>
              <PrimaryButton label="Çıkış yap" onPress={() => void logout()} />
              {authStepDone ? (
                <Pressable accessibilityRole="button" onPress={() => leave()} style={styles.textBtn}>
                  <Text style={styles.textBtnLabel}>Geri</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              <View accessibilityRole="tablist" style={styles.modeRow}>
                <ModeTab label="Giriş yap" selected={mode === 'giris'} onPress={() => switchMode('giris')} />
                <ModeTab label="Kayıt ol" selected={mode === 'kayit'} onPress={() => switchMode('kayit')} />
              </View>
              <Text style={styles.subtitle}>
                {mode === 'kayit'
                  ? `Yeni hesap ${FREE_MESSAGE_QUOTA} mesajla açılır. Görünen ad isteğe bağlıdır.`
                  : `Kayıtlı e-posta kalan mesajı geri açar. Yeni hesap için Kayıt ol. Misafir gezinebilir; yazmak giriş ister.`}
              </Text>
              <View style={styles.card}>
                {mode === 'kayit' ? (
                  <>
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
                  textContentType="password"
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <PrimaryButton
                  label={busy ? 'Bekle…' : mode === 'kayit' ? 'Kayıt ol' : 'Giriş yap'}
                  disabled={busy}
                  onPress={() => void submit()}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => switchMode(mode === 'kayit' ? 'giris' : 'kayit')}
                  style={styles.textBtn}
                >
                  <Text style={styles.link}>
                    {mode === 'kayit' ? 'Zaten hesabın var mı? Giriş yap' : 'Hesabın yok mu? Kayıt ol'}
                  </Text>
                </Pressable>
                <Text style={styles.fine}>Şifre yalnızca bu cihazda durur.</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gmail ile devam et"
                onPress={() => setError('Google girişi bu kurulumda bağlı değil. E-posta ile devam edebilirsin.')}
                style={styles.provider}
              >
                <View style={styles.providerMark}>
                  <Text style={styles.providerMarkText}>G</Text>
                </View>
                <View style={styles.providerCopy}>
                  <Text style={styles.providerTitle}>Gmail ile devam et</Text>
                  <Text style={styles.providerState}>Bu kurulumda Google istemcisi yok</Text>
                </View>
              </Pressable>

              <View accessibilityState={{ disabled: true }} style={[styles.provider, styles.providerOff]}>
                <View style={styles.providerMark}>
                  <Text style={styles.providerMarkText}>A</Text>
                </View>
                <View style={styles.providerCopy}>
                  <Text style={styles.providerTitle}>Apple ile devam et</Text>
                  <Text style={styles.providerState}>Yakında</Text>
                </View>
              </View>

              <Pressable accessibilityRole="button" onPress={guest} style={styles.textBtn}>
                <Text style={styles.textBtnLabel}>Misafir olarak devam et</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ModeTab({
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
      style={[styles.mode, selected && styles.modeOn]}
    >
      <Text style={[styles.modeLabel, selected && styles.modeLabelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  glow: {
    position: 'absolute',
    top: 36,
    alignSelf: 'center',
    width: 320,
    height: 220,
    borderRadius: 160,
    backgroundColor: 'rgba(36, 110, 210, 0.28)',
  },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 16,
  },
  kicker: {
    color: night.glowBright,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    color: night.text,
    fontFamily: fontFamily.serif,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '600',
    textAlign: 'center',
  },
  modeRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(130, 196, 255, 0.55)',
    backgroundColor: 'rgba(8, 18, 34, 0.72)',
  },
  mode: {
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOn: {
    backgroundColor: night.segment,
  },
  modeLabel: {
    color: '#D7E6F4',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fontFamily.sans,
  },
  modeLabelOn: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  link: {
    color: night.glowBright,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: night.muted,
    fontFamily: fontFamily.sans,
    fontSize: 16,
    lineHeight: 23,
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
    backgroundColor: 'rgba(8, 18, 34, 0.72)',
    color: night.text,
    fontSize: 16,
    paddingHorizontal: 16,
    fontFamily: fontFamily.sans,
  },
  error: {
    color: '#E7B4A8',
    fontSize: 14,
    lineHeight: 20,
  },
  fine: {
    color: night.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  email: {
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
  provider: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(120, 180, 230, 0.55)',
    backgroundColor: 'rgba(14, 36, 68, 0.9)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  providerOff: {
    opacity: 0.55,
  },
  providerMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(61, 160, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(143, 212, 255, 0.7)',
  },
  providerMarkText: {
    color: '#F4F7FB',
    fontSize: 18,
    fontWeight: '700',
  },
  providerCopy: {
    flex: 1,
    gap: 2,
  },
  providerTitle: {
    color: night.text,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamily.sans,
  },
  providerState: {
    color: night.glowBright,
    fontSize: 13,
    fontFamily: fontFamily.sans,
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
});
