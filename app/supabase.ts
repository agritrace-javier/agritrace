// app/supabase.ts
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

type ExtraConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function getExtra(): ExtraConfig {
  // Expo config can be exposed differently depending on Expo Go / Dev Client / EAS builds
  const extra =
    (Constants.expoConfig as any)?.extra ??
    (Constants as any)?.manifest?.extra ??
    (Constants as any)?.manifest2?.extra ??
    {};

  return extra as ExtraConfig;
}

const extra = getExtra();

const supabaseUrl = String(extra?.supabaseUrl ?? "").trim();
const supabaseAnonKey = String(extra?.supabaseAnonKey ?? "").trim();

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    "[Supabase] Missing supabaseUrl or supabaseAnonKey in app.json -> expo.extra";

  // Fail fast in dev to avoid silent bugs. In production, keep as console.warn.
  if (__DEV__) {
    console.error(msg, { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
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
