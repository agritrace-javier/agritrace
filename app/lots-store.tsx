// app/lots-store.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Lang } from "./i18n";
import { initialLots, Lot } from "./lots";
import { storageGet, storageRemove, storageSet } from "./storage";
import type { ThemeName } from "./theme";

type Mode = "client" | "operator";

/** ✅ Starknet (Simulated) proof stored per-lot */
export type LotProof = {
  lotId: string;

  // Hash computed locally (SHA-256)
  hash: string;

  // Simulated Starknet tx
  txHash: string;

  // Simulated block info
  blockNumber: number;

  // Timestamp when proof was created/saved
  ts: number;
};

type ProofStore = Record<string, LotProof>;

type LotsContextValue = {
  lots: Lot[];
  addLot: (lot: Lot) => void;
  deleteLot: (id: string) => void;
  getLotById: (id: string) => Lot | undefined;
  resetLots: () => void;

  mode: Mode;
  enterOperatorWithPin: (pin: string) => boolean;
  exitToClient: () => void;

  lang: Lang;
  setLang: (lang: Lang) => void;

  themeName: ThemeName;
  setThemeName: (t: ThemeName) => void;

  /** ✅ Proofs (hash + simulated tx) */
  proofs: ProofStore;
  getProofByLotId: (lotId: string) => LotProof | undefined;
  setProofForLot: (proof: LotProof) => void;
  clearProofForLot: (lotId: string) => void;
  resetProofs: () => void;
};

const LotsContext = createContext<LotsContextValue | null>(null);

const STORAGE_KEY_LOTS = "agritrace_lots_v1";
const STORAGE_KEY_MODE = "agritrace_mode_v1";
const STORAGE_KEY_LANG = "agritrace_lang_v1";
const STORAGE_KEY_THEME = "agritrace_theme_v1";
const STORAGE_KEY_PROOFS = "agritrace_proofs_v1";

// ✅ PIN oficial
const OPERATOR_PIN = "1616";

/**
 * ✅ Merge: si en storage faltan lotes demo, los recupera automáticamente.
 */
function mergeWithInitialLots(existing: Lot[]) {
  const map = new Map<string, Lot>();
  for (const l of existing) map.set(l.id, l);

  // agrega los initialLots que falten
  for (const base of initialLots) {
    if (!map.has(base.id)) map.set(base.id, base);
  }

  // orden: primero lo que ya existía, luego los que faltaban
  const existingIds = new Set(existing.map((x) => x.id));
  const missing = initialLots.filter((x) => !existingIds.has(x.id));

  return [...existing, ...missing];
}

/**
 * ✅ Acepta 2 formatos:
 * - NUEVO: product_en / product_es
 * - VIEJO: product
 * Siempre devuelve Lot válido (y luego lo completa con initialLots).
 */
function safeParseLots(raw: string | null): Lot[] {
  if (!raw) return initialLots;

  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return initialLots;

    const cleaned: Lot[] = data
      .filter((x) => x && typeof x === "object")
      .map((x: any) => {
        const id = String(x.id ?? "").trim();
        const origin = String(x.origin ?? "").trim();
        const harvestDate = String(x.harvestDate ?? "").trim();
        const batch = String(x.batch ?? "").trim();

        const product_en = x.product_en ? String(x.product_en).trim() : "";
        const product_es = x.product_es ? String(x.product_es).trim() : "";
        const legacyProduct = x.product ? String(x.product).trim() : "";

        const finalEn = product_en || legacyProduct || product_es;
        const finalEs = product_es || legacyProduct || product_en;

        const notes = x.notes ? String(x.notes) : undefined;
        const rating = typeof x.rating === "number" ? x.rating : undefined;

        if (!id || !origin || !harvestDate || !batch || !finalEn || !finalEs) return null;

        return {
          id,
          origin,
          harvestDate,
          batch,
          product_en: finalEn,
          product_es: finalEs,
          notes,
          rating,
        } as Lot;
      })
      .filter(Boolean) as Lot[];

    if (cleaned.length === 0) return initialLots;

    // ✅ aquí está el fix real
    return mergeWithInitialLots(cleaned);
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

/** ✅ Proof store parse (safe) */
function safeParseProofs(raw: string | null): ProofStore {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};

    const out: ProofStore = {};
    for (const [k, v] of Object.entries(obj)) {
      const p: any = v;
      const lotId = String(p?.lotId ?? k ?? "").trim();
      const hash = String(p?.hash ?? "").trim();
      const txHash = String(p?.txHash ?? "").trim();
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

export function LotsProvider({ children }: { children: React.ReactNode }) {
  const [lots, setLots] = useState<Lot[]>(initialLots);
  const [mode, setMode] = useState<Mode>("client");
  const [lang, setLang] = useState<Lang>("en");
  const [themeName, setThemeName] = useState<ThemeName>("dark");

  // ✅ NEW: proofs persisted
  const [proofs, setProofs] = useState<ProofStore>({});

  // ✅ LOAD (web + mobile)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // lots
        const rawLots = await storageGet(STORAGE_KEY_LOTS);
        const parsedLots = safeParseLots(rawLots);

        if (mounted) {
          setLots(parsedLots);
          // ✅ guardamos el “merge” para que ya quede fijo
          await storageSet(STORAGE_KEY_LOTS, JSON.stringify(parsedLots));
        }

        // mode
        const rawMode = await storageGet(STORAGE_KEY_MODE);
        const parsedMode = safeParseMode(rawMode);
        if (mounted && parsedMode) setMode(parsedMode);

        // lang
        const rawLang = await storageGet(STORAGE_KEY_LANG);
        const parsedLang = safeParseLang(rawLang);
        if (mounted && parsedLang) setLang(parsedLang);

        // theme
        const rawTheme = await storageGet(STORAGE_KEY_THEME);
        const parsedTheme = safeParseTheme(rawTheme);
        if (mounted && parsedTheme) setThemeName(parsedTheme);

        // proofs
        const rawProofs = await storageGet(STORAGE_KEY_PROOFS);
        const parsedProofs = safeParseProofs(rawProofs);
        if (mounted) setProofs(parsedProofs);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ SAVE lots
  useEffect(() => {
    storageSet(STORAGE_KEY_LOTS, JSON.stringify(lots));
  }, [lots]);

  // ✅ SAVE mode/lang/theme
  useEffect(() => {
    storageSet(STORAGE_KEY_MODE, mode);
    storageSet(STORAGE_KEY_LANG, lang);
    storageSet(STORAGE_KEY_THEME, themeName);
  }, [mode, lang, themeName]);

  // ✅ SAVE proofs
  useEffect(() => {
    storageSet(STORAGE_KEY_PROOFS, JSON.stringify(proofs));
  }, [proofs]);

  const addLot = (lot: Lot) => setLots((prev) => [lot, ...prev]);

  const deleteLot = (id: string) => {
    setLots((prev) => prev.filter((l) => l.id !== id));
    // ✅ also remove proof if lot removed
    setProofs((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const getLotById = (id: string) => lots.find((l) => l.id === id);

  const resetLots = () => {
    setLots(initialLots);
    storageRemove(STORAGE_KEY_LOTS);
  };

  const enterOperatorWithPin = (pin: string) => {
    if (pin === OPERATOR_PIN) {
      setMode("operator");
      return true;
    }
    return false;
  };

  const exitToClient = () => setMode("client");

  // ✅ proofs helpers
  const getProofByLotId = (lotId: string) => proofs[lotId];

  const setProofForLot = (proof: LotProof) => {
    const lotId = String(proof?.lotId ?? "").trim();
    if (!lotId) return;

    setProofs((prev) => ({
      ...prev,
      [lotId]: {
        lotId,
        hash: String(proof.hash ?? "").trim(),
        txHash: String(proof.txHash ?? "").trim(),
        blockNumber: Number(proof.blockNumber),
        ts: Number(proof.ts),
      },
    }));
  };

  const clearProofForLot = (lotId: string) => {
    const id = String(lotId ?? "").trim();
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


