// app/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

/**
 * ✅ In-memory fallback for web environments where localStorage is blocked
 * (Safari private mode / strict tracking protection / embedded webviews)
 */
const memStore = new Map<string, string>();

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis === "undefined") return null;
    if (!("localStorage" in globalThis)) return null;

    const ls = (globalThis as any).localStorage as Storage;

    // ✅ Test write to ensure it actually works (can throw)
    const testKey = "__agritrace_storage_test__";
    ls.setItem(testKey, "1");
    ls.removeItem(testKey);

    return ls;
  } catch {
    return null;
  }
}

export async function storageGet(key: string): Promise<string | null> {
  try {
    if (isWeb) {
      const ls = getLocalStorage();
      if (ls) {
        const v = ls.getItem(key);
        return v;
      }
      return memStore.has(key) ? memStore.get(key)! : null;
    }

    return await AsyncStorage.getItem(key);
  } catch {
    return isWeb && memStore.has(key) ? memStore.get(key)! : null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      const ls = getLocalStorage();
      if (ls) {
        ls.setItem(key, value);
        return;
      }
      memStore.set(key, value);
      return;
    }

    await AsyncStorage.setItem(key, value);
  } catch {
    if (isWeb) memStore.set(key, value);
    // ignore
  }
}

export async function storageRemove(key: string): Promise<void> {
  try {
    if (isWeb) {
      const ls = getLocalStorage();
      if (ls) {
        ls.removeItem(key);
      }
      memStore.delete(key);
      return;
    }

    await AsyncStorage.removeItem(key);
  } catch {
    if (isWeb) memStore.delete(key);
    // ignore
  }
}
