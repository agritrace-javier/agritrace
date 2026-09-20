/**
 * AgriTrace Supabase compatibility bridge.
 *
 * IMPORTANT:
 * This file must NOT create another Supabase client.
 *
 * Legacy MVP screens still import:
 *   import { supabase } from "./supabase";
 *
 * V2 uses:
 *   src/services/supabase/client.ts
 *
 * Both now resolve to the SAME Supabase client instance.
 * This prevents multiple GoTrue/Auth clients from competing
 * for the same browser session and auth lock.
 */

export {
  supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "../src/services/supabase/client";