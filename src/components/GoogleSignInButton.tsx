import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text } from 'react-native';

import type { AuthSessionResult } from 'expo-auth-session';

import {
  expoProxyProject,
  fetchGoogleProfile,
  GOOGLE_AUTH_FAILED,
  googleClientIds,
  googleConfigMessage,
  googleRedirectUri,
  isGoogleAuthConfigured,
  parseGoogleError,
} from '@/lib/googleAuth';
import { fontFamily } from '@/theme';

type Profile = { email: string; name: string; idToken: string };

type Props = {
  disabled?: boolean;
  onProfile: (profile: Profile) => void;
  onMessage: (message: string) => void;
  /** Opens the email register form when Google cannot finish. */
  onNeedEmail?: () => void;
};

export function GoogleSignInButton(props: Props) {
  if (!isGoogleAuthConfigured()) {
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
  return <ConfiguredGoogleButton {...props} />;
}

function ConfiguredGoogleButton({ disabled, onProfile, onMessage, onNeedEmail }: Props) {
  const webClientId = googleClientIds().web;
  const redirectUri = googleRedirectUri();
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: webClientId,
    webClientId,
    // Platform client ids would replace the Web client and drop the allow-listed proxy redirect.
    iosClientId: webClientId,
    androidClientId: webClientId,
    redirectUri,
    // Id token is in the proxy return URL. A code would still need a token exchange
    // whose redirect_uri is auth.expo.io, which fails when the app only sees exp://.
    responseType: AuthSession.ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    // select_account alone skips the password when Chrome is already signed in.
    extraParams: { prompt: 'login select_account' },
    shouldAutoExchangeCode: false,
  });
  const onProfileRef = useRef(onProfile);
  const onMessageRef = useRef(onMessage);
  const onNeedEmailRef = useRef(onNeedEmail);
  onProfileRef.current = onProfile;
  onMessageRef.current = onMessage;
  onNeedEmailRef.current = onNeedEmail;
  const handled = useRef('');

  const fail = (err?: unknown) => {
    const msg = parseGoogleError(err);
    if (msg) {
      onMessageRef.current(msg);
      onNeedEmailRef.current?.();
    }
  };

  const consume = async (result: AuthSessionResult | null) => {
    if (!result || result.type === 'cancel' || result.type === 'dismiss' || result.type === 'opened') return;
    if (result.type !== 'success') {
      fail(result);
      return;
    }
    const access = result.authentication?.accessToken || result.params.access_token || '';
    const idToken = result.authentication?.idToken || result.params.id_token || '';
    if (!access && !idToken) {
      fail('no_token');
      return;
    }
    const key = `${access}:${idToken}`;
    if (handled.current === key) return;
    handled.current = key;
    const profile = await fetchGoogleProfile(access, idToken);
    if (!profile) {
      fail('profile_fetch_failed');
      return;
    }
    onProfileRef.current({ ...profile, idToken });
  };

  useEffect(() => {
    if (__DEV__) console.info('[bu-gece] Google redirectUri', redirectUri);
  }, [redirectUri]);

  useEffect(() => {
    void consume(response);
  }, [response]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const search = new URLSearchParams(window.location.search);
    const idToken = hash.get('id_token') || search.get('id_token') || '';
    const access = hash.get('access_token') || search.get('access_token') || '';
    if (!idToken && !access) return;
    const state = hash.get('state') || search.get('state') || '';
    const expected = window.sessionStorage.getItem('bugece.google.state') ?? '';
    window.history.replaceState({}, '', window.location.pathname);
    if (expected && state && state !== expected) {
      fail('state_mismatch');
      return;
    }
    void fetchGoogleProfile(access, idToken).then((profile) => {
      if (!profile) {
        fail('profile_fetch_failed');
        return;
      }
      onProfileRef.current({ ...profile, idToken });
    });
  }, []);

  const press = async () => {
    if (disabled) return;
    if (!request) {
      onMessage('Google oturumu hazır değil. Biraz sonra tekrar dene, ya da e-posta ile kayıt ol.');
      onNeedEmail?.();
      return;
    }
    try {
      if (Platform.OS === 'web') {
        const authUrl = await request.makeAuthUrlAsync(Google.discovery);
        const returnUrl = `${window.location.origin}${window.location.pathname}`;
        window.sessionStorage.setItem('bugece.google.state', request.state ?? '');
        window.location.assign(
          `https://auth.expo.io/${expoProxyProject()}/start?${new URLSearchParams({
            authUrl,
            returnUrl,
          }).toString()}`,
        );
        return;
      }

      // Opening Google with redirect_uri=auth.expo.io alone has no returnUrl, so the
      // proxy shows "Something went wrong trying to finish signing in".
      const authUrl = await request.makeAuthUrlAsync(Google.discovery);
      const returnUrl = Linking.createURL('expo-auth-session');
      const startUrl = `https://auth.expo.io/${expoProxyProject()}/start?${new URLSearchParams({
        authUrl,
        returnUrl,
      }).toString()}`;
      const browser = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
      if (browser.type !== 'success' || !('url' in browser) || !browser.url) {
        if (browser.type === 'cancel' || browser.type === 'dismiss') return;
        fail(browser);
        return;
      }
      await consume(request.parseReturnUrl(browser.url));
    } catch (err) {
      fail(err);
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
