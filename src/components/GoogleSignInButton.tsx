import { ResponseType } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useMemo, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';

import type { AuthSessionResult } from 'expo-auth-session';

import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  GOOGLE_AUTH_FAILED,
  googleConfigMessage,
  resolveGoogleAuth,
  type GoogleAuthSetup,
} from '@/lib/googleAuth';
import { fontFamily } from '@/theme';

type Profile = { email: string; name: string };

type Props = {
  disabled?: boolean;
  onProfile: (profile: Profile) => void;
  onMessage: (message: string) => void;
  /** Opens the email register form when Google cannot finish. */
  onNeedEmail?: () => void;
};

export function GoogleSignInButton(props: Props) {
  const setup = useMemo(() => resolveGoogleAuth(), []);
  if (!setup) {
    return (
      <GmailPill
        disabled={props.disabled}
        onPress={() => {
          props.onMessage(googleConfigMessage());
          props.onNeedEmail?.();
        }}
      />
    );
  }
  if (!setup.canPrompt) {
    return (
      <GmailPill
        disabled={props.disabled}
        onPress={() => {
          props.onMessage(setup.blockedReason);
          props.onNeedEmail?.();
        }}
      />
    );
  }
  return <ConfiguredGoogleButton {...props} setup={setup} />;
}

function ConfiguredGoogleButton({ disabled, onProfile, onMessage, onNeedEmail, setup }: Props & { setup: GoogleAuthSetup }) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: setup.clientId,
    webClientId: setup.webClientId,
    iosClientId: setup.iosClientId,
    androidClientId: setup.androidClientId,
    redirectUri: setup.redirectUri,
    responseType: ResponseType.Code,
    usePKCE: true,
    shouldAutoExchangeCode: false,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });
  const onProfileRef = useRef(onProfile);
  const onMessageRef = useRef(onMessage);
  const onNeedEmailRef = useRef(onNeedEmail);
  onProfileRef.current = onProfile;
  onMessageRef.current = onMessage;
  onNeedEmailRef.current = onNeedEmail;
  const handled = useRef('');
  const requestRef = useRef(request);
  requestRef.current = request;

  const fail = () => {
    onMessageRef.current(GOOGLE_AUTH_FAILED);
    onNeedEmailRef.current?.();
  };

  const consume = async (result: AuthSessionResult | null) => {
    if (!result || result.type === 'cancel' || result.type === 'dismiss' || result.type === 'opened') return;
    if (result.type !== 'success') {
      fail();
      return;
    }
    let access = result.authentication?.accessToken || result.params.access_token || '';
    let idToken = result.authentication?.idToken || result.params.id_token || '';
    const code = result.params.code || '';
    const key = code || access || idToken;
    if (!key || handled.current === key) return;
    handled.current = key;
    if (!access && !idToken && code) {
      const exchanged = await exchangeGoogleCode({
        clientId: setup.clientId,
        code,
        redirectUri: setup.redirectUri,
        codeVerifier: requestRef.current?.codeVerifier ?? '',
      });
      if (!exchanged) {
        fail();
        return;
      }
      access = exchanged.accessToken;
      idToken = exchanged.idToken;
    }
    const profile = await fetchGoogleProfile(access, idToken);
    if (!profile) {
      fail();
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
      onMessage('Google oturumu hazır değil. Biraz sonra tekrar dene, ya da e-posta ile kayıt ol.');
      onNeedEmail?.();
      return;
    }
    try {
      await consume(await promptAsync());
    } catch {
      fail();
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
