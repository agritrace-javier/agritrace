// app/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

function getLocalStorage(): Storage | null {
  try {
    // En algunos entornos web puede no existir o estar bloqueado
    return typeof globalThis !== "undefined" && "localStorage" in globalThis
      ? (globalThis as any).localStorage
      : null;
  } catch {
    return null;
  }
}

export async function storageGet(key: string): Promise<string | null> {
  try {
    if (isWeb) {
      const ls = getLocalStorage();
      return ls ? ls.getItem(key) : null;
    }
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      const ls = getLocalStorage();
      if (ls) ls.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export async function storageRemove(key: string): Promise<void> {
  try {
    if (isWeb) {
      const ls = getLocalStorage();
      if (ls) ls.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}
