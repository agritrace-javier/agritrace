// app/supabase.ts
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

/**
 * We support BOTH:
 * 1) EXPO_PUBLIC_* env vars (preferred, secure, from .env.local)
 * 2) expo.extra fallback (for older builds / safety)
 */

type ExtraConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function getExtra(): ExtraConfig {
  const extra =
    (Constants.expoConfig as any)?.extra ??
    (Constants as any)?.manifest?.extra ??
    (Constants as any)?.manifest2?.extra ??
    {};
  return extra as ExtraConfig;
}

const extra = getExtra();

// 🔐 Preferred: ENV (from .env.local)
const envSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 🛟 Fallback: expo.extra (in case env is missing)
const supabaseUrl = String(
  envSupabaseUrl ?? extra?.supabaseUrl ?? ""
).trim();

const supabaseAnonKey = String(
  envSupabaseAnonKey ?? extra?.supabaseAnonKey ?? ""
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    "[Supabase] Missing Supabase config. Expected EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY";

  if (__DEV__) {
    console.error(msg, {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
    });
    throw new Error(msg);
  } else {
    console.warn(msg);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // MVP: no auth yet
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
