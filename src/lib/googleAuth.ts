import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

function readEnv(name: string): string {
  const value = (process.env as Record<string, string | undefined>)[name];
  return value?.trim() ?? '';
}

export function googleClientIds(): { web: string; ios: string; android: string } {
  // Expo inlines only EXPO_PUBLIC_ variables. A bare GOOGLE_CLIENT_ID never reaches the app.
  const web = readEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID') || readEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
  return {
    web,
    ios: readEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
    android: readEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
  };
}

/**
 * Exact redirect URIs registered on the Web client. Google matches these literally.
 * `http://localhost:8081/giris` and `bugece://giris` are not on that list.
 */
const ALLOWED_WEB_REDIRECTS = [
  'https://auth.expo.io/@anonymous/bu-gece',
  'http://localhost:8081',
  'https://localhost',
  'http://localhost',
  'http://127.0.0.1',
  'https://127.0.0.1',
] as const;

/** Expo Go proxy. `projectNameForProxy: 'bu-gece'` with an anonymous Expo owner. */
const EXPO_GO_PROXY_REDIRECT = 'https://auth.expo.io/@anonymous/bu-gece';

/**
 * SDK 57 `makeRedirectUri` does not read `projectNameForProxy` (it returns `exp://` or `bugece://`).
 * Those custom schemes are what Google rejects for this Web client. When that happens, use the
 * allow-listed HTTPS proxy or the allow-listed localhost origin.
 */
export function googleRedirectUri(): string {
  const computed = AuthSession.makeRedirectUri({
    scheme: 'bugece',
    path: 'giris',
    projectNameForProxy: 'bu-gece',
  } as AuthSession.AuthSessionRedirectUriOptions & { projectNameForProxy: string });

  if ((ALLOWED_WEB_REDIRECTS as readonly string[]).includes(computed)) return computed;
  if (Platform.OS === 'web') return allowlistedWebOrigin(computed);
  return EXPO_GO_PROXY_REDIRECT;
}

function allowlistedWebOrigin(computed: string): string {
  try {
    const url = new URL(computed);
    const https = url.protocol === 'https:';
    if (url.hostname === 'localhost' && url.port === '8081') return 'http://localhost:8081';
    if (url.hostname === 'localhost' && https) return 'https://localhost';
    if (url.hostname === 'localhost') return 'http://localhost';
    if (url.hostname === '127.0.0.1' && https) return 'https://127.0.0.1';
    if (url.hostname === '127.0.0.1') return 'http://127.0.0.1';
  } catch {
    // Not an absolute URL (custom scheme). Fall through to the dev origin that is registered.
  }
  return 'http://localhost:8081';
}

export type GoogleAuthSetup = {
  clientId: string;
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
  redirectUri: string;
  canPrompt: boolean;
  blockedReason: string;
};

/**
 * The redirect is always one of the Web client's allow-listed URIs, so the request uses that
 * Web client id. Passing the iOS client id here would drop the allow-listed redirect
 * (`iosClientId` wins on iOS) and Google would 400 again.
 * The iOS client id stays in EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID for store builds.
 */
export function resolveGoogleAuth(): GoogleAuthSetup | null {
  const ids = googleClientIds();
  if (!ids.web) return null;
  const redirectUri = googleRedirectUri();
  if (__DEV__) console.info('[bu-gece] Google redirectUri', redirectUri);
  return {
    clientId: ids.web,
    webClientId: ids.web,
    redirectUri,
    canPrompt: true,
    blockedReason: '',
  };
}

export function googleConfigMessage(): string {
  const which =
    Platform.OS === 'ios'
      ? 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'
      : Platform.OS === 'android'
        ? 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'
        : 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID';
  return `Gmail girişi için ${which} gerekli. E-posta ile kayıt olabilirsin.`;
}

export const GOOGLE_AUTH_FAILED =
  'Google girişi tamamlanamadı. E-posta ile kayıt olabilirsin.';

type GoogleProfile = { email: string; name: string };

function decodeBase64Url(input: string): string | null {
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
    if (typeof globalThis.atob !== 'function') return null;
    const binary = globalThis.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function profileFromIdToken(idToken: string): GoogleProfile | null {
  const payload = idToken.split('.')[1];
  if (!payload) return null;
  const json = decodeBase64Url(payload);
  if (!json) return null;
  try {
    const data = JSON.parse(json) as { email?: string; name?: string };
    if (!data.email) return null;
    return { email: data.email, name: data.name ?? '' };
  } catch {
    return null;
  }
}

export async function exchangeGoogleCode(input: {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ accessToken: string; idToken: string } | null> {
  try {
    const token = await AuthSession.exchangeCodeAsync(
      {
        clientId: input.clientId,
        code: input.code,
        redirectUri: input.redirectUri,
        extraParams: { code_verifier: input.codeVerifier },
      },
      { tokenEndpoint: GOOGLE_TOKEN_ENDPOINT },
    );
    if (!token.accessToken && !token.idToken) return null;
    return { accessToken: token.accessToken ?? '', idToken: token.idToken ?? '' };
  } catch {
    return null;
  }
}

/** Prefer the userinfo endpoint. The id token is only a fallback from the same auth redirect. */
export async function fetchGoogleProfile(
  accessToken: string,
  idToken: string,
): Promise<GoogleProfile | null> {
  if (accessToken) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = (await response.json()) as { email?: string; name?: string };
        if (data.email) return { email: data.email, name: data.name ?? '' };
      }
    } catch {
      // Fall through to the id token payload.
    }
  }
  if (idToken) return profileFromIdToken(idToken);
  return null;
}
