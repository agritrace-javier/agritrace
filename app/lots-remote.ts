// app/lots-remote.ts
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import type { Lot } from "./lots";
import { supabase } from "./supabase";

const TABLE = "lots";
const BUCKET = "lot-photos";

type SchemaMode = "camel" | "snake";
let schemaModeCache: SchemaMode | null = null;

function s(v: any) {
  return String(v ?? "").trim();
}

function isHttpUrl(u: string) {
  return /^https?:\/\//i.test(u);
}

function extFromUri(uri: string) {
  const clean = uri.split("?")[0].split("#")[0];
  const m = clean.match(/\.([a-zA-Z0-9]+)$/);
  return (m?.[1] || "jpg").toLowerCase();
}

function contentTypeFromExt(ext: string) {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "jpeg":
    case "jpg":
    default:
      return "image/jpeg";
  }
}

function dataUrlToParts(dataUrl: string) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], b64: m[2] };
}

function base64ToUint8Array(b64: string) {
  const atobFn = (globalThis as any)?.atob as ((s: string) => string) | undefined;
  if (typeof atobFn === "function") {
    const bin = atobFn(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  try {
    const BufferImpl = (globalThis as any)?.Buffer ?? require("buffer")?.Buffer ?? null;
    if (BufferImpl) {
      const buf = BufferImpl.from(b64, "base64");
      return new Uint8Array(buf);
    }
  } catch {
    // ignore
  }

  throw new Error(
    "Base64 decode failed: no atob/Buffer available. Install 'buffer' or ensure polyfills are loaded."
  );
}

function toMs(v: any): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return Date.now();
}

function normalizeInsertError(e: any) {
  const msg = String(e?.message ?? e ?? "");
  if (/row-level security|violates row-level security/i.test(msg)) {
    return new Error(
      "Supabase RLS is blocking inserts/updates on 'lots'. You must add an INSERT/UPDATE/DELETE policy for anon or disable RLS for MVP."
    );
  }
  return e;
}

/**
 * Detect whether table columns are camelCase (harvestDate, createdAt)
 * or snake_case (harvest_date, created_at).
 */
async function detectSchemaMode(): Promise<SchemaMode> {
  if (schemaModeCache) return schemaModeCache;

  const camelTry = await supabase.from(TABLE).select("id, harvestDate, createdAt").limit(1);

  if (!camelTry.error) {
    schemaModeCache = "camel";
    return "camel";
  }

  const msg = String(camelTry.error?.message ?? "");
  if (/column .*harvestDate|createdAt/i.test(msg) || /does not exist/i.test(msg)) {
    schemaModeCache = "snake";
    return "snake";
  }

  schemaModeCache = "snake";
  return "snake";
}

function lotToRowCamel(lot: Lot) {
  return {
    id: s(lot.id).toUpperCase(),
    product_en: s(lot.product_en),
    product_es: s(lot.product_es),
    origin: s(lot.origin),
    harvestDate: s(lot.harvestDate),
    batch: s(lot.batch),
    notes: lot.notes ? String(lot.notes) : null,
    rating: typeof lot.rating === "number" ? lot.rating : null,
    createdAt: typeof lot.createdAt === "number" ? lot.createdAt : Date.now(),
    photos: Array.isArray(lot.photos) ? lot.photos.map((x) => s(x)).filter(Boolean).slice(0, 12) : null,
  };
}

function lotToRowSnake(lot: Lot) {
  return {
    id: s(lot.id).toUpperCase(),
    product_en: s(lot.product_en),
    product_es: s(lot.product_es),
    origin: s(lot.origin),
    harvest_date: s(lot.harvestDate),
    batch: s(lot.batch),
    notes: lot.notes ? String(lot.notes) : null,
    rating: typeof lot.rating === "number" ? lot.rating : null,
    created_at: typeof lot.createdAt === "number" ? lot.createdAt : Date.now(),
    photos: Array.isArray(lot.photos) ? lot.photos.map((x) => s(x)).filter(Boolean).slice(0, 12) : null,
  };
}

function rowToLotAny(r: any): Lot {
  const harvest = s(r?.harvestDate ?? r?.harvest_date);
  const created = r?.createdAt ?? r?.created_at;

  return {
    id: s(r?.id).toUpperCase(),
    product_en: s(r?.product_en),
    product_es: s(r?.product_es),
    origin: s(r?.origin),
    harvestDate: harvest,
    batch: s(r?.batch),
    notes: r?.notes ?? undefined,
    rating: typeof r?.rating === "number" ? r.rating : undefined,
    createdAt: toMs(created),
    photos: Array.isArray(r?.photos) ? r.photos : undefined,
  };
}

/** ===========================
 * ✅ DB API
 * =========================== */
export async function fetchLotsRemote(): Promise<Lot[]> {
  const mode = await detectSchemaMode();
  const orderCol = mode === "camel" ? "createdAt" : "created_at";

  const { data, error } = await supabase.from(TABLE).select("*").order(orderCol, { ascending: false });
  if (error) throw error;

  return (data ?? []).map(rowToLotAny);
}

export async function upsertLotRemote(lot: Lot): Promise<void> {
  const mode = await detectSchemaMode();
  const row = mode === "camel" ? lotToRowCamel(lot) : lotToRowSnake(lot);

  const { error } = await supabase.from(TABLE).upsert(row as any, { onConflict: "id" });
  if (error) throw normalizeInsertError(error);
}

export async function deleteLotRemote(id: string): Promise<void> {
  const lotId = s(id).toUpperCase();
  const { error } = await supabase.from(TABLE).delete().eq("id", lotId);
  if (error) throw normalizeInsertError(error);
}

/** ===========================
 * ✅ Storage upload
 * =========================== */
async function uploadOnePhoto(lotId: string, uri: string, index: number) {
  if (isHttpUrl(uri)) return uri;

  const safeLotId = s(lotId).toUpperCase();
  const ext = extFromUri(uri);
  const ct = contentTypeFromExt(ext);
  const path = `${safeLotId}/${Date.now()}_${index}.${ext}`;

  let bytes: Uint8Array;
  let mime = ct;

  if (uri.startsWith("data:")) {
    const parts = dataUrlToParts(uri);
    if (!parts) throw new Error("Invalid data URL photo");
    mime = parts.mime || ct;
    bytes = base64ToUint8Array(parts.b64);
  } else if (Platform.OS === "web") {
    const res = await fetch(uri);
    const ab = await res.arrayBuffer();
    bytes = new Uint8Array(ab);
    mime = res.headers.get("content-type") || ct;
  } else {
    // Mobile (file://, content://, etc.) — may fail for some URI types
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" as any });
    bytes = base64ToUint8Array(b64);
  }

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: mime,
    upsert: true,
  });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = data?.publicUrl ?? "";
  if (!publicUrl) throw new Error("Could not get public URL for uploaded photo");

  return publicUrl;
}

/**
 * ✅ IMPORTANT CHANGE:
 * - Do NOT fail the whole upload if one photo fails.
 * - Keep existing http(s) URLs.
 * - Try upload for local URIs; if a URI fails, we skip it and continue.
 */
export async function uploadLotPhotosIfNeeded(lot: Lot): Promise<Lot> {
  const photos = Array.isArray(lot.photos) ? lot.photos : [];
  if (photos.length === 0) return lot;

  const out: string[] = [];

  for (let idx = 0; idx < Math.min(12, photos.length); idx++) {
    const uri = s(photos[idx]);
    if (!uri) continue;

    if (isHttpUrl(uri)) {
      out.push(uri);
      continue;
    }

    try {
      const uploadedUrl = await uploadOnePhoto(lot.id, uri, idx);
      if (uploadedUrl) out.push(uploadedUrl);
    } catch (e: any) {
      console.warn("[uploadOnePhoto] failed for", lot.id, "idx", idx, "uri", uri, "err", e?.message ?? e);
      // Skip this photo so we can still save the lot with any successful uploads
      continue;
    }
  }

  const uniq = Array.from(new Set(out.map((x) => s(x)).filter(Boolean)));

  // If nothing was uploaded/kept, return original lot unchanged
  if (uniq.length === 0) return lot;

  return { ...lot, photos: uniq };
}

/** ===========================
 * ✅ Realtime subscription
 * =========================== */
export function subscribeLotsRemote(onChange: (lots: Lot[]) => void) {
  const channel = supabase
    .channel("lots-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, async () => {
      try {
        const lots = await fetchLotsRemote();
        onChange(lots);
      } catch {
        // ignore
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
