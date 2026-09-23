import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, initializeFirestore, memoryLocalCache, type Firestore } from 'firebase/firestore';

const PLACEHOLDER = /^(your[-_]|replace|changeme|todo|xxx|paste)/i;

function readEnv(name: string): string {
  const value = (process.env as Record<string, string | undefined>)[name]?.trim() ?? '';
  if (!value || PLACEHOLDER.test(value)) return '';
  return value;
}

/** Null when the public web config is missing, so the app keeps the local Genel seeds. */
export function firebaseOptionsFromEnv(): FirebaseOptions | null {
  const apiKey = readEnv('EXPO_PUBLIC_FIREBASE_API_KEY');
  const projectId = readEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  const appId = readEnv('EXPO_PUBLIC_FIREBASE_APP_ID');
  if (!apiKey || !projectId || !appId) return null;

  const authDomain = readEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN') || `${projectId}.firebaseapp.com`;
  const storageBucket = readEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
  const messagingSenderId = readEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  const measurementId = readEnv('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID');

  const options: FirebaseOptions = { apiKey, authDomain, projectId, appId };
  if (storageBucket) options.storageBucket = storageBucket;
  if (messagingSenderId) options.messagingSenderId = messagingSenderId;
  if (measurementId) options.measurementId = measurementId;
  return options;
}

let app: FirebaseApp | null = null;
let appReady = false;
let database: Firestore | null = null;
let databaseReady = false;
let warned = false;

function warnFirebase(error: unknown): void {
  if (!__DEV__ || warned) return;
  warned = true;
  console.warn('[bu-gece] Firebase presence is off', error);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (appReady) return app;
  appReady = true;
  const options = firebaseOptionsFromEnv();
  if (!options) return null;
  try {
    app = getApps()[0] ?? initializeApp(options);
  } catch (error) {
    app = null;
    warnFirebase(error);
  }
  return app;
}

/**
 * Firestore in Expo Go uses the JS SDK. Long polling avoids the WebChannel
 * transport that React Native does not speak. Memory cache skips IndexedDB.
 */
export function getPresenceDb(): Firestore | null {
  if (databaseReady) return database;
  databaseReady = true;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  try {
    database = initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
    });
  } catch (error) {
    try {
      database = getFirestore(firebaseApp);
    } catch (fallbackError) {
      database = null;
      warnFirebase(fallbackError ?? error);
    }
  }
  return database;
}
