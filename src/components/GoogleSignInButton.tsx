import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';

import type { AuthSessionResult } from 'expo-auth-session';

import {
  fetchGoogleProfile,
  GOOGLE_REDIRECT,
  googleClientIds,
  googleConfigMessage,
  isGoogleAuthConfigured,
} from '@/lib/googleAuth';
import { fontFamily } from '@/theme';

type Profile = { email: string; name: string };

type Props = {
  disabled?: boolean;
  onProfile: (profile: Profile) => void;
  onMessage: (message: string) => void;
};

export function GoogleSignInButton(props: Props) {
  if (!isGoogleAuthConfigured()) {
    return (
      <GmailPill
        disabled={props.disabled}
        onPress={() => props.onMessage(googleConfigMessage())}
      />
    );
  }
  return <ConfiguredGoogleButton {...props} />;
}

function ConfiguredGoogleButton({ disabled, onProfile, onMessage }: Props) {
  const ids = googleClientIds();
  const webClientId = ids.web || ids.ios || ids.android;
  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      clientId: webClientId,
      webClientId,
      iosClientId: ids.ios || ids.web,
      androidClientId: ids.android || ids.web,
      scopes: ['openid', 'profile', 'email'],
      selectAccount: true,
    },
    GOOGLE_REDIRECT,
  );
  const onProfileRef = useRef(onProfile);
  const onMessageRef = useRef(onMessage);
  onProfileRef.current = onProfile;
  onMessageRef.current = onMessage;
  const handled = useRef('');

  const consume = async (result: AuthSessionResult | null) => {
    if (!result || result.type !== 'success') {
      if (result?.type === 'error') {
        onMessageRef.current('Google girişi tamamlanamadı. Yönlendirme adresini ve istemci kimliğini kontrol et.');
      }
      return;
    }
    const access = result.authentication?.accessToken || result.params.access_token || '';
    const idToken = result.authentication?.idToken || result.params.id_token || '';
    if (!access && !idToken) return;
    const key = `${access}:${idToken}`;
    if (handled.current === key) return;
    handled.current = key;
    const profile = await fetchGoogleProfile(access, idToken);
    if (!profile) {
      onMessageRef.current('Google hesabından e-posta alınamadı.');
      return;
    }
    onProfileRef.current(profile);
  };

  useEffect(() => {
    void consume(response);
  }, [response]);

  const press = async () => {
    if (disabled) return;
    if (!request) {
      onMessage('Google oturumu hazır değil. Biraz sonra tekrar dene.');
      return;
    }
    try {
      await consume(await promptAsync());
    } catch {
      onMessage('Google girişi açılamadı. İstemci kimliğini kontrol et.');
    }
  };

  return <GmailPill disabled={disabled} onPress={() => void press()} />;
}

function GmailPill({ disabled, onPress }: { disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Gmail ile devam et"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Image source={require('../../assets/google-g.png')} style={styles.mark} />
      <Text style={styles.label}>Gmail ile devam et</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 22,
    shadowColor: '#8FB4E0',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.7,
  },
  mark: {
    width: 22,
    height: 22,
  },
  label: {
    color: '#202124',
    fontFamily: fontFamily.sans,
    fontSize: 16.5,
    fontWeight: '600',
  },
});
