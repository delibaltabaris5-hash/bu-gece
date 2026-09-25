import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, initializeFirestore, memoryLocalCache, type Firestore } from 'firebase/firestore';

const PLACEHOLDER = /^(your[-_]|replace|changeme|todo|xxx|paste)/i;

/** Public web app on Firebase project bu-gece. Client config, not a secret. */
const BU_GECE_WEB = {
  apiKey: 'AIzaSyBdQN11BwwxNVFImZiK7cz-iltcH73Vtqg',
  authDomain: 'bu-gece.firebaseapp.com',
  projectId: 'bu-gece',
  storageBucket: 'bu-gece.firebasestorage.app',
  messagingSenderId: '746154431428',
  appId: '1:746154431428:web:0ba9a25181417a76414a91',
} as const;

function readEnv(name: string): string {
  const value = (process.env as Record<string, string | undefined>)[name]?.trim() ?? '';
  if (!value || PLACEHOLDER.test(value)) return '';
  return value;
}

/** EXPO_PUBLIC_FIREBASE_* when set, otherwise the bu-gece web app above. */
export function firebaseOptionsFromEnv(): FirebaseOptions {
  const measurementId = readEnv('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID');
  const options: FirebaseOptions = {
    apiKey: readEnv('EXPO_PUBLIC_FIREBASE_API_KEY') || BU_GECE_WEB.apiKey,
    authDomain: readEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN') || BU_GECE_WEB.authDomain,
    projectId: readEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID') || BU_GECE_WEB.projectId,
    storageBucket: readEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET') || BU_GECE_WEB.storageBucket,
    messagingSenderId: readEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || BU_GECE_WEB.messagingSenderId,
    appId: readEnv('EXPO_PUBLIC_FIREBASE_APP_ID') || BU_GECE_WEB.appId,
  };
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
