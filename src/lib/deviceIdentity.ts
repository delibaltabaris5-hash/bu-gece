import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { readSecureValue, writeSecureValue } from '@/lib/secureKv';

/** Fixed key so an iOS vendor-id rotation does not orphan the Keychain quota. */
const INSTALL_ID_KEY = 'bugece.install-id';

export type DeviceIdSource = 'secure-store' | 'android-id' | 'ios-vendor' | 'uuid';

export type DeviceIdentity = {
  id: string;
  source: DeviceIdSource;
};

let cached: DeviceIdentity | null = null;

export function quotaStorageKey(deviceId: string): string {
  const safe = deviceId.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 128);
  return `bugece.quota.${safe || 'unknown'}`;
}

function usableId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const compact = trimmed.replace(/-/g, '');
  if (/^0+$/.test(compact)) return null;
  return trimmed;
}

function randomUuid(): string {
  const cryptoObj = globalThis.crypto;
  if (typeof cryptoObj?.randomUUID === 'function') return cryptoObj.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof cryptoObj?.getRandomValues === 'function') cryptoObj.getRandomValues(bytes);
  else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function readPlatformId(): Promise<DeviceIdentity | null> {
  try {
    if (Platform.OS === 'android') {
      const id = usableId(Application.getAndroidId());
      return id ? { id, source: 'android-id' } : null;
    }
    if (Platform.OS === 'ios') {
      const id = usableId(await Application.getIosIdForVendorAsync());
      return id ? { id, source: 'ios-vendor' } : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Prefer the id already stored in SecureStore. iOS identifierForVendor often
 * changes when this is the only app from the vendor and the user reinstalls,
 * while the Keychain copy can remain. Android usually clears SecureStore on
 * uninstall, so the next launch falls through to androidId or a new UUID.
 */
export async function resolveDeviceIdentity(): Promise<DeviceIdentity | null> {
  if (cached) return cached;

  const stored = await readSecureValue(INSTALL_ID_KEY);
  if (!stored.ok) return null;

  const existing = usableId(stored.value);
  if (existing) {
    cached = { id: existing, source: 'secure-store' };
    return cached;
  }

  const created = (await readPlatformId()) ?? { id: randomUuid(), source: 'uuid' as const };
  const saved = await writeSecureValue(INSTALL_ID_KEY, created.id);
  if (!saved && created.source === 'uuid') return null;
  cached = created;
  return cached;
}
