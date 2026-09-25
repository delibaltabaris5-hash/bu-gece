import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function googleClientIds(): { web: string; ios: string; android: string } {
  // Metro inlines only a direct `process.env.EXPO_PUBLIC_*` read. A dynamic lookup stays empty in the web bundle.
  const web =
    trimEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) ||
    trimEnv(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
  return {
    web,
    ios: trimEnv(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    android: trimEnv(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
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

/** Expo Go proxy path registered on the Web client. */
const ANONYMOUS_PROXY_PROJECT = '@anonymous/bu-gece';

/**
 * Project segment for `https://auth.expo.io/<project>/start` and for the native
 * `redirect_uri`. Those two must name the same project, and that project must be
 * allow-listed. An Expo owner that is not on the Web client falls back to
 * `@anonymous/bu-gece`.
 */
export function expoProxyProject(): string {
  const config = Constants.expoConfig;
  const fromConfig =
    config?.originalFullName ||
    (config?.owner ? `@${config.owner}/${config.slug || 'bu-gece'}` : '');
  const project = fromConfig.replace(/^\/+/, '');
  if (!project) return ANONYMOUS_PROXY_PROJECT;
  const redirect = `https://auth.expo.io/${project}`;
  if ((ALLOWED_WEB_REDIRECTS as readonly string[]).includes(redirect)) return project;
  return ANONYMOUS_PROXY_PROJECT;
}

/**
 * SDK 57 `makeRedirectUri` ignores `projectNameForProxy` and returns `exp://` or `bugece://`.
 * Google rejects those for this Web client. Web stays on an allow-listed localhost origin.
 * Native uses the Expo auth proxy; the button opens that proxy through `/start`.
 */
export function googleRedirectUri(): string {
  const computed = AuthSession.makeRedirectUri({
    scheme: 'bugece',
    path: 'giris',
    preferLocalhost: true,
  });

  if ((ALLOWED_WEB_REDIRECTS as readonly string[]).includes(computed)) return computed;
  // Phone browsers cannot return to localhost. The Expo proxy URI is the one Google already allows.
  if (Platform.OS === 'web') return `https://auth.expo.io/${expoProxyProject()}`;
  return `https://auth.expo.io/${expoProxyProject()}`;
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

/**
 * Expo Go must send the Web client id. The iOS/Android client ids do not own
 * `https://auth.expo.io/@anonymous/bu-gece`, and `useAuthRequest` prefers them
 * on those platforms when they are set.
 */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(googleClientIds().web);
}

export function googleConfigMessage(): string {
  return 'Gmail girişi için EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID gerekli. E-posta ile kayıt olabilirsin.';
}

export function parseGoogleError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();
  if (lower.includes('10:') || lower.includes('developer_error') || lower.includes('api_exception: 10')) {
    return 'Google Play Services / SHA-1 veya paket adı uyuşmazlığı (Hata 10).';
  }
  if (lower.includes('12500') || lower.includes('sign_in_failed')) {
    return 'Google Giriş yapılandırma hatası (Hata 12500). OAuth Client ID kontrol edilmeli.';
  }
  if (lower.includes('12501') || lower.includes('sign_in_cancelled')) {
    return ''; // Kullanıcı iptal etti, sessiz dön
  }
  if (lower.includes('network') || lower.includes('timeout')) {
    return 'İnternet bağlantısı hatası. Lütfen bağlantını kontrol et.';
  }
  if (lower.includes('account-exists-with-different-credential')) {
    return 'Bu e-posta başka bir yöntemle kayıtlı. Lütfen şifre ile giriş yap.';
  }
  return GOOGLE_AUTH_FAILED;
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
