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

type LotsContextValue = {
  lots: Lot[];
  addLot: (lot: Lot) => void;
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

const STORAGE_KEY_LOTS = "agritrace_lots_v2";
const STORAGE_KEY_MODE = "agritrace_mode_v1";
const STORAGE_KEY_LANG = "agritrace_lang_v1";
const STORAGE_KEY_THEME = "agritrace_theme_v1";
const STORAGE_KEY_PROOFS = "agritrace_proofs_v1";

// tombstones for deleted DEMO lots
const STORAGE_KEY_DELETED_DEMOS = "agritrace_deleted_demo_ids_v1";

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

export function LotsProvider({ children }: { children: React.ReactNode }) {
  const [lots, setLots] = useState<Lot[]>(initialLots);
  const [mode, setMode] = useState<Mode>("client");
  const [lang, setLang] = useState<Lang>("en");
  const [themeName, setThemeName] = useState<ThemeName>("dark");

  const [proofs, setProofs] = useState<ProofStore>({});
  const [deletedDemoIds, setDeletedDemoIds] = useState<Set<string>>(new Set());

  // Keep a ref so realtime + remote sync can access latest tombstones without re-reading storage every time
  const deletedDemoIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    deletedDemoIdsRef.current = deletedDemoIds;
  }, [deletedDemoIds]);

  async function loadDeletedDemoSet(): Promise<Set<string>> {
    const rawDeleted = await storageGet(STORAGE_KEY_DELETED_DEMOS);
    const deleted = safeParseStringArray(rawDeleted);
    return new Set(deleted.map((x) => normalizeId(x)));
  }

  async function syncFromRemote(deletedSet: Set<string>) {
    const remote = await fetchLotsRemote();
    const mergedRemote = mergeWithInitialLots(remote, deletedSet);
    setLots(mergedRemote);
    // NOTE: storage persistence happens in the lots effect (single place)
  }

  /** ===========================
   * ✅ 1) Load local cache first
   * ✅ 2) Then fetch Supabase and replace (log errors)
   * ✅ 3) Subscribe realtime (log errors)
   * =========================== */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // deleted demos
        const deletedSet = await loadDeletedDemoSet();
        if (mounted) setDeletedDemoIds(deletedSet);

        // local lots
        const rawLots = await storageGet(STORAGE_KEY_LOTS);
        const parsedLots = safeParseLots(rawLots);
        const mergedLocal = mergeWithInitialLots(parsedLots, deletedSet);
        if (mounted) setLots(mergedLocal);

        // mode/lang/theme
        const rawMode = await storageGet(STORAGE_KEY_MODE);
        const parsedMode = safeParseMode(rawMode);
        if (mounted && parsedMode) setMode(parsedMode);

        const rawLang = await storageGet(STORAGE_KEY_LANG);
        const parsedLang = safeParseLang(rawLang);
        if (mounted && parsedLang) setLang(parsedLang);

        const rawTheme = await storageGet(STORAGE_KEY_THEME);
        const parsedTheme = safeParseTheme(rawTheme);
        if (mounted && parsedTheme) setThemeName(parsedTheme);

        // proofs
        const rawProofs = await storageGet(STORAGE_KEY_PROOFS);
        const parsedProofs = safeParseProofs(rawProofs);
        if (mounted) setProofs(parsedProofs);

        // ✅ remote fetch (LOG errors)
        try {
          await syncFromRemote(deletedSet);
          console.log("[Supabase fetchLotsRemote] OK");
        } catch (e) {
          console.warn("[Supabase fetchLotsRemote] failed:", errMsg(e));
        }
      } catch (e) {
        console.warn("[LotsProvider init] failed:", errMsg(e));
      }
    })();

    // realtime subscription (LOG errors)
    const unsub = subscribeLotsRemote(async (remoteLots) => {
      try {
        const deletedSet = deletedDemoIdsRef.current ?? new Set<string>();
        const merged = mergeWithInitialLots(remoteLots, deletedSet);
        setLots(merged);
        // NOTE: storage persistence happens in the lots effect (single place)
      } catch (e) {
        console.warn("[Supabase realtime] failed:", errMsg(e));
      }
    });

    return () => {
      mounted = false;
      try {
        unsub?.();
      } catch {
        // ignore
      }
    };
  }, []);

  // SAVE lots cache (single persistence point)
  useEffect(() => {
    storageSet(STORAGE_KEY_LOTS, JSON.stringify(lots));
  }, [lots]);

  // SAVE deleted demos
  useEffect(() => {
    const arr = Array.from(deletedDemoIds.values());
    storageSet(STORAGE_KEY_DELETED_DEMOS, JSON.stringify(arr));
  }, [deletedDemoIds]);

  // SAVE mode/lang/theme
  useEffect(() => {
    storageSet(STORAGE_KEY_MODE, mode);
    storageSet(STORAGE_KEY_LANG, lang);
    storageSet(STORAGE_KEY_THEME, themeName);
  }, [mode, lang, themeName]);

  // SAVE proofs
  useEffect(() => {
    storageSet(STORAGE_KEY_PROOFS, JSON.stringify(proofs));
  }, [proofs]);

  /** ===========================
   * ✅ Remote-aware mutations
   * =========================== */

  const addLot = (lot: Lot) => {
    const normalized = normalizeLotForStore(lot);
    if (!normalized) return;

    // optimistic local
    setLots((prev) => {
      const without = prev.filter((l) => normalizeId(l.id) !== normalizeId(normalized.id));
      return [normalized, ...without];
    });

    (async () => {
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
        console.log("[Supabase addLot/upsert] OK", withUploaded.id);

        // ✅ after remote success, refresh from remote (prevents drift)
        await syncFromRemote(deletedSet);
      } catch (e) {
        console.warn("[Supabase addLot/upsert] failed:", errMsg(e));
      }
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

        // ✅ refresh
        await syncFromRemote(deletedSet);
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

        // ✅ refresh
        await syncFromRemote(deletedSet);
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
    setLots(initialLots);
    storageRemove(STORAGE_KEY_LOTS);

    setProofs({});
    storageRemove(STORAGE_KEY_PROOFS);

    setDeletedDemoIds(new Set());
    storageRemove(STORAGE_KEY_DELETED_DEMOS);
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
    setProofs({});
    storageRemove(STORAGE_KEY_PROOFS);
  };

  const value = useMemo(
    () => ({
      lots,
      addLot,
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
