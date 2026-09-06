// app/lots-store.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Lang } from "./i18n";
import { initialLots, Lot } from "./lots";
import { storageGet, storageRemove, storageSet } from "./storage";
import type { ThemeName } from "./theme";

import {
  deleteLotRemote,
  fetchLotsRemote,
  subscribeLotsRemote,
  uploadLotPhotosIfNeeded,
  upsertLotRemote,
} from "./lots-remote";

// ✅ listen to auth changes and re-sync
import { supabase } from "./supabase";

type Mode = "client" | "operator";

/** ✅ Starknet (Simulated) proof stored per-lot */
export type LotProof = {
  lotId: string;
  hash: string;
  txHash: string;
  blockNumber: number;
  ts: number;
};

type ProofStore = Record<string, LotProof>;

type SaveLotResult =
  | { ok: true; lot: Lot }
  | { ok: false; error: string };

type LotsContextValue = {
  lots: Lot[];
  addLot: (lot: Lot) => void; // kept for compatibility
  saveLot: (lot: Lot) => Promise<SaveLotResult>; // ✅ NEW (awaitable)
  deleteLot: (id: string) => void;
  getLotById: (id: string) => Lot | undefined;
  resetLots: () => void;

  updateLot: (id: string, patch: Partial<Lot>) => void;

  mode: Mode;
  enterOperatorWithPin: (pin: string) => boolean;
  exitToClient: () => void;

  lang: Lang;
  setLang: (lang: Lang) => void;

  themeName: ThemeName;
  setThemeName: (t: ThemeName) => void;

  proofs: ProofStore;
  getProofByLotId: (lotId: string) => LotProof | undefined;
  setProofForLot: (proof: LotProof) => void;
  clearProofForLot: (lotId: string) => void;
  resetProofs: () => void;
};

const LotsContext = createContext<LotsContextValue | null>(null);

/**
 * ✅ PASO 3 — keys are now user-scoped:
 *   <base>:<userId>
 * fallback when no session: <base>:anon
 *
 * We also keep legacy keys (no suffix) for one-time migration.
 */
const STORAGE_BASE_LOTS = "agritrace_lots_v2";
const STORAGE_BASE_MODE = "agritrace_mode_v1";
const STORAGE_BASE_LANG = "agritrace_lang_v1";
const STORAGE_BASE_THEME = "agritrace_theme_v1";
const STORAGE_BASE_PROOFS = "agritrace_proofs_v1";
const STORAGE_BASE_DELETED_DEMOS = "agritrace_deleted_demo_ids_v1";

const OPERATOR_PIN = "1616";

/** ---------------------------
 * ✅ Helpers
 * --------------------------*/
function s(v: any) {
  return String(v ?? "").trim();
}

function normalizeId(id: any) {
  return s(id).toUpperCase();
}

function normalizePhotos(v: any): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) return undefined;
  const out = v.map((p) => s(p)).filter(Boolean).slice(0, 12);
  return out.length ? out : [];
}

function normalizeProductFields(x: any): { product_en: string; product_es: string } {
  const en = s(x?.product_en);
  const es = s(x?.product_es);

  const legacy = s(x?.product);
  const esTypo1 = s(x?.product_ests);
  const esTypo2 = s(x?.product_est);

  const finalEn = en || legacy || es || esTypo1 || esTypo2;
  const finalEs = es || esTypo1 || esTypo2 || legacy || en;

  return { product_en: finalEn, product_es: finalEs };
}

function normalizeCreatedAt(v: any): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return Date.now();
}

function safeParseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map((x) => normalizeId(x)).filter(Boolean);
  } catch {
    return [];
  }
}

function isDemoLotId(id: string) {
  const demoIds = new Set(initialLots.map((x) => normalizeId(x.id)));
  return demoIds.has(normalizeId(id));
}

function mergeWithInitialLots(existing: Lot[], deletedDemoIds: Set<string>) {
  const map = new Map<string, Lot>();
  for (const l of existing) map.set(normalizeId(l.id), l);

  for (const base of initialLots) {
    const baseId = normalizeId(base.id);
    if (deletedDemoIds.has(baseId)) continue;
    if (!map.has(baseId)) map.set(baseId, base as any);
  }

  // Keep order: user lots first, then missing demos
  const existingIds = new Set(existing.map((x) => normalizeId(x.id)));
  const missing = initialLots.filter((x) => {
    const id = normalizeId(x.id);
    if (deletedDemoIds.has(id)) return false;
    return !existingIds.has(id);
  });

  return [...existing, ...(missing as any)];
}

function safeParseLots(raw: string | null): Lot[] {
  if (!raw) return initialLots;

  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return initialLots;

    const cleaned: Lot[] = data
      .filter((x) => x && typeof x === "object")
      .map((x: any) => {
        const id = normalizeId(x.id);
        if (!id) return null;

        const origin = s(x.origin) || "—";
        const harvestDate = s(x.harvestDate) || "—";
        const batch = s(x.batch) || "—";

        const { product_en, product_es } = normalizeProductFields(x);

        const finalEn = product_en || "Unknown";
        const finalEs = product_es || finalEn || "Desconocido";

        const notes = x.notes ? String(x.notes) : undefined;
        const rating = typeof x.rating === "number" ? x.rating : undefined;

        const createdAt = normalizeCreatedAt(x.createdAt);
        const photos = normalizePhotos(x.photos);

        return {
          id,
          origin,
          harvestDate,
          batch,
          product_en: finalEn,
          product_es: finalEs,
          notes,
          rating,
          createdAt,
          photos,
        } as Lot;
      })
      .filter(Boolean) as Lot[];

    return cleaned.length ? cleaned : initialLots;
  } catch {
    return initialLots;
  }
}

function safeParseMode(raw: string | null): Mode | null {
  if (!raw) return null;
  return raw === "operator" || raw === "client" ? raw : null;
}

function safeParseLang(raw: string | null): Lang | null {
  if (!raw) return null;
  return raw === "en" || raw === "es" ? raw : null;
}

function safeParseTheme(raw: string | null): ThemeName | null {
  if (!raw) return null;
  return raw === "light" || raw === "dark" ? raw : null;
}

function safeParseProofs(raw: string | null): ProofStore {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};

    const out: ProofStore = {};
    for (const [k, v] of Object.entries(obj)) {
      const p: any = v;
      const lotId = normalizeId(p?.lotId ?? k ?? "");
      const hash = s(p?.hash);
      const txHash = s(p?.txHash);
      const blockNumber = Number(p?.blockNumber);
      const ts = Number(p?.ts);

      if (!lotId || !hash || !txHash) continue;
      if (!Number.isFinite(blockNumber)) continue;
      if (!Number.isFinite(ts)) continue;

      out[lotId] = { lotId, hash, txHash, blockNumber, ts };
    }
    return out;
  } catch {
    return {};
  }
}

function normalizeLotForStore(input: any): Lot | null {
  const id = normalizeId(input?.id);
  if (!id) return null;

  const origin = s(input?.origin) || "—";
  const harvestDate = s(input?.harvestDate) || "—";
  const batch = s(input?.batch) || "—";

  const { product_en, product_es } = normalizeProductFields(input);
  const finalEn = product_en || "Unknown";
  const finalEs = product_es || finalEn || "Desconocido";

  const createdAt = normalizeCreatedAt(input?.createdAt);
  const photos = normalizePhotos(input?.photos);

  const notes = input?.notes ? String(input.notes) : undefined;
  const rating = typeof input?.rating === "number" ? input.rating : undefined;

  return {
    id,
    origin,
    harvestDate,
    batch,
    product_en: finalEn,
    product_es: finalEs,
    notes,
    rating,
    createdAt,
    photos,
  } as Lot;
}

function errMsg(e: any) {
  return String(e?.message ?? e ?? "");
}

function countUserLots(list: Lot[]) {
  // “user lots” = lots que NO son demos (initialLots)
  return (list ?? []).filter((l) => l && !isDemoLotId(normalizeId(l.id))).length;
}

function cacheKey(base: string, userId: string | null) {
  const uid = s(userId) || "anon";
  return `${base}:${uid}`;
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id;
    return uid ? String(uid) : null;
  } catch {
    return null;
  }
}

export function LotsProvider({ children }: { children: React.ReactNode }) {
  const [lots, setLots] = useState<Lot[]>(initialLots);
  const [mode, setMode] = useState<Mode>("client");
  const [lang, setLang] = useState<Lang>("en");
  const [themeName, setThemeName] = useState<ThemeName>("dark");

  const [proofs, setProofs] = useState<ProofStore>({});
  const [deletedDemoIds, setDeletedDemoIds] = useState<Set<string>>(new Set());

  // ✅ PASO 3 — active userId (drives storage keys)
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  // Keep refs for latest state used inside async/realtime closures
  const deletedDemoIdsRef = useRef<Set<string>>(new Set());
  const lotsRef = useRef<Lot[]>(initialLots);

  useEffect(() => {
    deletedDemoIdsRef.current = deletedDemoIds;
  }, [deletedDemoIds]);

  useEffect(() => {
    lotsRef.current = lots;
  }, [lots]);

  // ✅ keep realtime unsubscribe in a ref so we can restart it on auth changes
  const realtimeUnsubRef = useRef<null | (() => void)>(null);

  async function loadDeletedDemoSet(uid: string | null): Promise<Set<string>> {
    const key = cacheKey(STORAGE_BASE_DELETED_DEMOS, uid);
    const rawDeleted = await storageGet(key);

    // legacy migration
    if (!rawDeleted) {
      const legacy = await storageGet(STORAGE_BASE_DELETED_DEMOS);
      if (legacy) {
        await storageSet(key, legacy);
      }
    }

    const deleted = safeParseStringArray(rawDeleted ?? (await storageGet(key)));
    return new Set(deleted.map((x) => normalizeId(x)));
  }

  async function loadLotsFromCache(uid: string | null, deletedSet: Set<string>) {
    const key = cacheKey(STORAGE_BASE_LOTS, uid);
    let rawLots = await storageGet(key);

    // legacy migration
    if (!rawLots) {
      const legacy = await storageGet(STORAGE_BASE_LOTS);
      if (legacy) {
        await storageSet(key, legacy);
        rawLots = legacy;
      }
    }

    const parsedLots = safeParseLots(rawLots);
    const mergedLocal = mergeWithInitialLots(parsedLots, deletedSet);
    setLots(mergedLocal);
  }

  async function loadProofsFromCache(uid: string | null) {
    const key = cacheKey(STORAGE_BASE_PROOFS, uid);
    let rawProofs = await storageGet(key);

    // legacy migration
    if (!rawProofs) {
      const legacy = await storageGet(STORAGE_BASE_PROOFS);
      if (legacy) {
        await storageSet(key, legacy);
        rawProofs = legacy;
      }
    }

    const parsedProofs = safeParseProofs(rawProofs);
    setProofs(parsedProofs);
  }

  /**
   * ✅ PASO 2 — Defensive sync:
   * If remote returns [], DO NOT overwrite UI if we already have user lots locally.
   */
  async function syncFromRemote(deletedSet: Set<string>, reason: string) {
    const remote = await fetchLotsRemote();

    const localNow = lotsRef.current ?? [];
    const localUserCount = countUserLots(localNow);
    const remoteCount = Array.isArray(remote) ? remote.length : 0;

    if (remoteCount === 0 && localUserCount > 0) {
      console.warn(
        `[LotsProvider] SKIP overwrite (remote=0, localUserLots=${localUserCount}) reason=${reason}`
      );
      return;
    }

    const mergedRemote = mergeWithInitialLots(remote ?? [], deletedSet);
    setLots(mergedRemote);
    console.log(
      `[LotsProvider] Applied remote lots=${remoteCount} (localUserLots=${localUserCount}) reason=${reason}`
    );
  }

  function startRealtime() {
    // stop previous if any
    try {
      realtimeUnsubRef.current?.();
    } catch {
      // ignore
    }

    realtimeUnsubRef.current = subscribeLotsRemote(async (remoteLots) => {
      try {
        const deletedSet = deletedDemoIdsRef.current ?? new Set<string>();

        const localNow = lotsRef.current ?? [];
        const localUserCount = countUserLots(localNow);
        const remoteCount = Array.isArray(remoteLots) ? remoteLots.length : 0;

        if (remoteCount === 0 && localUserCount > 0) {
          console.warn(
            `[LotsProvider] SKIP realtime overwrite (remote=0, localUserLots=${localUserCount})`
          );
          return;
        }

        const merged = mergeWithInitialLots(remoteLots ?? [], deletedSet);
        setLots(merged);
        console.log(
          `[LotsProvider] Applied realtime lots=${remoteCount} (localUserLots=${localUserCount})`
        );
      } catch (e) {
        console.warn("[Supabase realtime] failed:", errMsg(e));
      }
    });
  }

  /**
   * ✅ Load mode/lang/theme (still global, by design)
   * (these are preferences, not per-user data)
   */
  async function loadPrefsOnce() {
    const rawMode = await storageGet(STORAGE_BASE_MODE);
    const parsedMode = safeParseMode(rawMode);
    if (parsedMode) setMode(parsedMode);

    const rawLang = await storageGet(STORAGE_BASE_LANG);
    const parsedLang = safeParseLang(rawLang);
    if (parsedLang) setLang(parsedLang);

    const rawTheme = await storageGet(STORAGE_BASE_THEME);
    const parsedTheme = safeParseTheme(rawTheme);
    if (parsedTheme) setThemeName(parsedTheme);
  }

  /**
   * ✅ PASO 3 — Load per-user cache + migrate legacy if needed
   */
  async function loadUserScopedCache(uid: string | null) {
    const deletedSet = await loadDeletedDemoSet(uid);
    setDeletedDemoIds(deletedSet);

    await loadLotsFromCache(uid, deletedSet);
    await loadProofsFromCache(uid);

    return deletedSet;
  }

  /** ===========================
   * ✅ Init + realtime + auth change
   * =========================== */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // prefs (global)
        await loadPrefsOnce();

        // determine initial user id
        const uid = await getCurrentUserId();
        if (!mounted) return;
        setActiveUserId(uid);

        // per-user cache
        const deletedSet = await loadUserScopedCache(uid);
        if (!mounted) return;

        // remote fetch (defensive)
        try {
          await syncFromRemote(deletedSet, "init");
          console.log("[Supabase fetchLotsRemote] OK");
        } catch (e) {
          console.warn("[Supabase fetchLotsRemote] failed:", errMsg(e));
        }
      } catch (e) {
        console.warn("[LotsProvider init] failed:", errMsg(e));
      }
    })();

    // start realtime once
    startRealtime();

    // on auth change: switch user cache, re-fetch, restart realtime
    const { data: authSub } = supabase.auth.onAuthStateChange(async (event) => {
      try {
        const uid = await getCurrentUserId();
        setActiveUserId(uid);

        const deletedSet = await loadUserScopedCache(uid);

        await syncFromRemote(deletedSet, `auth:${event}`);
        console.log("[Supabase auth change] re-sync OK:", event);

        startRealtime();
      } catch (e) {
        console.warn("[Supabase auth change] re-sync failed:", errMsg(e));
      }
    });

    return () => {
      mounted = false;

      try {
        realtimeUnsubRef.current?.();
      } catch {
        // ignore
      }

      try {
        authSub.subscription.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, []);

  /**
   * ✅ SAVE caches (per-user)
   * - lots
   * - deleted demos
   * - proofs
   */
  useEffect(() => {
    const uid = activeUserIdRef.current;
    const key = cacheKey(STORAGE_BASE_LOTS, uid);
    storageSet(key, JSON.stringify(lots));
  }, [lots]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    const key = cacheKey(STORAGE_BASE_DELETED_DEMOS, uid);
    const arr = Array.from(deletedDemoIds.values());
    storageSet(key, JSON.stringify(arr));
  }, [deletedDemoIds]);

  useEffect(() => {
    const uid = activeUserIdRef.current;
    const key = cacheKey(STORAGE_BASE_PROOFS, uid);
    storageSet(key, JSON.stringify(proofs));
  }, [proofs]);

  // SAVE prefs (global)
  useEffect(() => {
    storageSet(STORAGE_BASE_MODE, mode);
    storageSet(STORAGE_BASE_LANG, lang);
    storageSet(STORAGE_BASE_THEME, themeName);
  }, [mode, lang, themeName]);

  /** ===========================
   * ✅ Remote-aware mutations
   * =========================== */

  // ✅ NEW: awaitable save that returns success/failure to UI
  const saveLot = async (lot: Lot): Promise<SaveLotResult> => {
    const normalized = normalizeLotForStore(lot);
    if (!normalized) return { ok: false, error: "Invalid lot payload (missing id)" };

    // optimistic local (so UI updates instantly)
    setLots((prev) => {
      const without = prev.filter((l) => normalizeId(l.id) !== normalizeId(normalized.id));
      return [normalized, ...without];
    });

    try {
      const deletedSet = deletedDemoIdsRef.current ?? new Set<string>();

      const withUploaded = await uploadLotPhotosIfNeeded(normalized);

      // reflect photo URL changes locally (if any)
      setLots((prev) =>
        prev.map((l) =>
          normalizeId(l.id) === normalizeId(withUploaded.id) ? (withUploaded as any) : l
        )
      );

      await upsertLotRemote(withUploaded);
      console.log("[Supabase saveLot/upsert] OK", withUploaded.id);

      // sync to be sure both web/mobile match server truth
      await syncFromRemote(deletedSet, "saveLot");

      return { ok: true, lot: withUploaded as any };
    } catch (e) {
      const msg = errMsg(e) || "Unknown Supabase error while saving lot";
      console.warn("[Supabase saveLot] failed:", msg);
      return { ok: false, error: msg };
    }
  };

  // keep existing addLot but now it uses saveLot internally
  const addLot = (lot: Lot) => {
    (async () => {
      await saveLot(lot);
    })();
  };

  const updateLot = (id: string, patch: Partial<Lot>) => {
    const lotId = normalizeId(id);
    if (!lotId) return;

    const { id: _ignored, ...safePatch } = (patch ?? {}) as any;

    let nextLot: Lot | null = null;

    // optimistic local
    setLots((prev) =>
      prev.map((l) => {
        if (normalizeId(l.id) !== lotId) return l;
        const merged = { ...l, ...safePatch, id: l.id };
        const normalized = normalizeLotForStore(merged) ?? l;
        nextLot = normalized;
        return normalized;
      })
    );

    (async () => {
      try {
        if (!nextLot) return;

        const deletedSet = deletedDemoIdsRef.current ?? new Set<string>();

        const withUploaded = await uploadLotPhotosIfNeeded(nextLot);

        setLots((prev) =>
          prev.map((l) => (normalizeId(l.id) === lotId ? (withUploaded as any) : l))
        );

        await upsertLotRemote(withUploaded);
        console.log("[Supabase updateLot/upsert] OK", withUploaded.id);

        await syncFromRemote(deletedSet, "updateLot");
      } catch (e) {
        console.warn("[Supabase updateLot/upsert] failed:", errMsg(e));
      }
    })();
  };

  const deleteLot = (id: string) => {
    const lotId = normalizeId(id);
    if (!lotId) return;

    // demo tombstone
    if (isDemoLotId(lotId)) {
      setDeletedDemoIds((prev) => {
        const next = new Set(prev);
        next.add(lotId);
        return next;
      });
    }

    // optimistic local
    setLots((prev) => prev.filter((l) => normalizeId(l.id) !== lotId));

    // clear proof local
    setProofs((prev) => {
      if (!prev[lotId]) return prev;
      const next = { ...prev };
      delete next[lotId];
      return next;
    });

    (async () => {
      try {
        const deletedSet = deletedDemoIdsRef.current ?? new Set<string>();

        await deleteLotRemote(lotId);
        console.log("[Supabase deleteLot] OK", lotId);

        await syncFromRemote(deletedSet, "deleteLot");
      } catch (e) {
        console.warn("[Supabase deleteLot] failed:", errMsg(e));
      }
    })();
  };

  const getLotById = (id: string) => {
    const lotId = normalizeId(id);
    return lots.find((l) => normalizeId(l.id) === lotId);
  };

  const resetLots = () => {
    const uid = activeUserIdRef.current;

    setLots(initialLots);
    storageRemove(cacheKey(STORAGE_BASE_LOTS, uid));

    setProofs({});
    storageRemove(cacheKey(STORAGE_BASE_PROOFS, uid));

    setDeletedDemoIds(new Set());
    storageRemove(cacheKey(STORAGE_BASE_DELETED_DEMOS, uid));

    // also clear legacy keys (optional but helps cleanup)
    storageRemove(STORAGE_BASE_LOTS);
    storageRemove(STORAGE_BASE_PROOFS);
    storageRemove(STORAGE_BASE_DELETED_DEMOS);
  };

  const enterOperatorWithPin = (pin: string) => {
    if (pin === OPERATOR_PIN) {
      setMode("operator");
      return true;
    }
    return false;
  };

  const exitToClient = () => setMode("client");

  // proofs helpers
  const getProofByLotId = (lotId: string) => proofs[normalizeId(lotId)];

  const setProofForLot = (proof: LotProof) => {
    const lotId = normalizeId(proof?.lotId);
    if (!lotId) return;

    setProofs((prev) => ({
      ...prev,
      [lotId]: {
        lotId,
        hash: s(proof.hash),
        txHash: s(proof.txHash),
        blockNumber: Number(proof.blockNumber),
        ts: Number(proof.ts),
      },
    }));
  };

  const clearProofForLot = (lotId: string) => {
    const id = normalizeId(lotId);
    if (!id) return;

    setProofs((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const resetProofs = () => {
    const uid = activeUserIdRef.current;
    setProofs({});
    storageRemove(cacheKey(STORAGE_BASE_PROOFS, uid));
  };

  const value = useMemo(
    () => ({
      lots,
      addLot,
      saveLot, // ✅ NEW
      deleteLot,
      getLotById,
      resetLots,

      updateLot,

      mode,
      enterOperatorWithPin,
      exitToClient,

      lang,
      setLang,

      themeName,
      setThemeName,

      proofs,
      getProofByLotId,
      setProofForLot,
      clearProofForLot,
      resetProofs,
    }),
    [lots, mode, lang, themeName, proofs]
  );

  return <LotsContext.Provider value={value}>{children}</LotsContext.Provider>;
}

export function useLots() {
  const ctx = useContext(LotsContext);
  if (!ctx) throw new Error("useLots must be used inside LotsProvider");
  return ctx;
}
