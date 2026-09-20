import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { AppState, Platform } from "react-native";

type ExtraConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function getExtraConfig(): ExtraConfig {
  const extra =
    (Constants.expoConfig as any)?.extra ??
    (Constants as any)?.manifest?.extra ??
    (Constants as any)?.manifest2?.extra ??
    {};

  return extra as ExtraConfig;
}

const extra = getExtraConfig();

const supabaseUrl = String(
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
    extra.supabaseUrl ??
    ""
).trim();

const supabaseAnonKey = String(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    extra.supabaseAnonKey ??
    ""
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[AgriTrace] Missing Supabase configuration. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY =
  supabaseAnonKey;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      ...(Platform.OS !== "web"
        ? {
            storage: AsyncStorage,
          }
        : {}),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

/*
 * Supabase recommends controlling automatic token
 * refresh with the React Native AppState lifecycle.
 *
 * Web handles its own browser lifecycle.
 */
if (Platform.OS !== "web") {
  AppState.addEventListener(
    "change",
    (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    }
  );
}