import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * iOS Keychain accessibility. AFTER_FIRST_UNLOCK stays readable after the first
 * unlock and is the item class that most often survives an app reinstall.
 * Android still drops the whole store on uninstall.
 */
const NATIVE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export type SecureRead = { ok: true; value: string | null } | { ok: false };

export async function readSecureValue(key: string): Promise<SecureRead> {
  if (Platform.OS === 'web') return readWeb(key);
  try {
    if (!(await SecureStore.isAvailableAsync())) return { ok: false };
    const value = await SecureStore.getItemAsync(key, NATIVE_OPTIONS);
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

export async function deleteSecureValue(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(key);
    } catch {
      return;
    }
    return;
  }
  try {
    if (!(await SecureStore.isAvailableAsync())) return;
    await SecureStore.deleteItemAsync(key, NATIVE_OPTIONS);
  } catch {
    return;
  }
}

export async function writeSecureValue(key: string, value: string): Promise<boolean> {
  if (Platform.OS === 'web') return writeWeb(key, value);
  try {
    if (!(await SecureStore.isAvailableAsync())) return false;
    await SecureStore.setItemAsync(key, value, NATIVE_OPTIONS);
    return true;
  } catch {
    return false;
  }
}

function readWeb(key: string): SecureRead {
  try {
    if (typeof localStorage === 'undefined') return { ok: false };
    return { ok: true, value: localStorage.getItem(key) };
  } catch {
    return { ok: false };
  }
}

function writeWeb(key: string, value: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
