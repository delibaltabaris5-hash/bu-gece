import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_REDIRECT: { scheme: string; path: string } = {
  scheme: 'bugece',
  path: 'giris',
};

function readEnv(name: string): string {
  const value = (process.env as Record<string, string | undefined>)[name];
  return value?.trim() ?? '';
}

export function googleClientIds(): { web: string; ios: string; android: string } {
  // Expo inlines only EXPO_PUBLIC_ variables. A bare GOOGLE_CLIENT_ID never reaches the app.
  const web =
    readEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID') || readEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
  return {
    web,
    ios: readEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
    android: readEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
  };
}

/** True when this platform has a client id the Google hook can load. */
export function isGoogleAuthConfigured(): boolean {
  const { web, ios, android } = googleClientIds();
  if (Platform.OS === 'ios') return Boolean(ios || web);
  if (Platform.OS === 'android') return Boolean(android || web);
  return Boolean(web);
}

/** Shown only when this platform has no client id. The button still explains which variable to set. */
export function googleConfigMessage(): string {
  const which =
    Platform.OS === 'ios'
      ? 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'
      : Platform.OS === 'android'
        ? 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'
        : 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID veya EXPO_PUBLIC_GOOGLE_CLIENT_ID';
  return `Gmail girişi Google oturumunu açar. Bu kurulumda istemci kimliği yok: ${which}. Expo, EXPO_PUBLIC_ öneki olmayan GOOGLE_CLIENT_ID değerini uygulamaya koymaz.`;
}

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
