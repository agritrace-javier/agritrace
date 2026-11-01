import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "../src/features/auth";
import {
  createOrganizationLot,
  getLotsByOrganization,
  updateOrganizationLot,
} from "../src/features/lots/lotsService";
import type {
  OrganizationLot,
  UpdateLotInput,
} from "../src/features/lots/lotsService";
import type { Lang } from "./i18n";
import type { Lot } from "./lots";
import { uploadLotPhotosIfNeeded } from "./lots-remote";
import { storageGet, storageSet } from "./storage";
import { supabase } from "./supabase";
import type { ThemeName } from "./theme";

type Mode = "client" | "operator";

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
  isLoadingLots: boolean;
  lotsError: string | null;
  refreshLots: () => Promise<void>;
  addLot: (lot: Lot) => void;
  saveLot: (lot: Lot) => Promise<SaveLotResult>;
  updateLot: (id: string, patch: Partial<Lot>) => Promise<SaveLotResult>;
  deleteLot: (id: string) => Promise<void>;
  getLotById: (id: string) => Lot | undefined;
  resetLots: () => void;
  mode: Mode;
  enterOperatorWithPin: (pin: string) => boolean;
  exitToClient: () => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  themeName: ThemeName;
  setThemeName: (theme: ThemeName) => void;
  proofs: ProofStore;
  getProofByLotId: (id: string) => LotProof | undefined;
  setProofForLot: (proof: LotProof) => void;
  clearProofForLot: (id: string) => void;
  resetProofs: () => void;
};

const LotsContext = createContext<LotsContextValue | null>(null);
const MODE_KEY = "agritrace_mode_v1";
const LANG_KEY = "agritrace_lang_v1";
const THEME_KEY = "agritrace_theme_v1";

function normalizeId(id: string): string {
  return id.trim().toUpperCase();
}

function errorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Could not complete the lot operation.";
}

function parseProofs(raw: string | null): ProofStore {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const result: ProofStore = {};
    for (const value of Object.values(parsed)) {
      if (!value || typeof value !== "object") continue;
      const proof = value as Partial<LotProof>;
      if (
        typeof proof.lotId !== "string" ||
        !proof.lotId.trim() ||
        typeof proof.hash !== "string" ||
        typeof proof.txHash !== "string" ||
        typeof proof.blockNumber !== "number" ||
        !Number.isFinite(proof.blockNumber) ||
        typeof proof.ts !== "number" ||
        !Number.isFinite(proof.ts)
      ) {
        continue;
      }
      const id = normalizeId(proof.lotId);
      result[id] = {
        lotId: id,
        hash: proof.hash,
        txHash: proof.txHash,
        blockNumber: proof.blockNumber,
        ts: proof.ts,
      };
    }
    return result;
  } catch {
    return {};
  }
}

async function preparePhotos(lot: Lot): Promise<string[]> {
  const original = Array.from(
    new Set((lot.photos ?? []).map((uri) => uri.trim()).filter(Boolean))
  );

  if (original.length > 12) {
    throw new Error("A lot can contain at most 12 photos.");
  }

  const uploaded = await uploadLotPhotosIfNeeded({
    ...lot,
    photos: original,
  });
  const photos = uploaded.photos ?? [];

  if (
    photos.length !== original.length ||
    photos.some((uri) => !/^https?:\/\//i.test(uri))
  ) {
    throw new Error(
      "Some photos could not be uploaded. The lot was not saved. Please retry."
    );
  }
  return photos;
}

type ScopedProviderProps = {
  children: React.ReactNode;
  userId: string | null;
  organizationId: string | null;
  canCreate: boolean;
  canUpdate: boolean;
};

export function LotsProvider({ children }: { children: React.ReactNode }) {
  const { user, organization, hasActiveMembership, can } = useAuth();

  const userId = user?.id ?? null;
  const organizationId =
    userId && hasActiveMembership ? organization?.id ?? null : null;

  const scope =
    userId && organizationId ? `${userId}:${organizationId}` : "no-organization";

  return (
    <ScopedLotsProvider
      key={scope}
      userId={userId}
      organizationId={organizationId}
      canCreate={hasActiveMembership && can("lots.create")}
      canUpdate={hasActiveMembership && can("lots.update")}
    >
      {children}
    </ScopedLotsProvider>
  );
}

function ScopedLotsProvider({
  children,
  userId,
  organizationId,
  canCreate,
  canUpdate,
}: ScopedProviderProps) {
  const [lots, setLots] = useState<OrganizationLot[]>([]);
  const [isLoadingLots, setIsLoadingLots] = useState(!!organizationId);
  const [lotsError, setLotsError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("client");
  const [lang, setLang] = useState<Lang>("en");
  const [themeName, setThemeName] = useState<ThemeName>("dark");
  const [prefsReady, setPrefsReady] = useState(false);
  const [proofs, setProofs] = useState<ProofStore>({});
  const [proofsReady, setProofsReady] = useState(false);

  const mounted = useRef(false);
  const requestVersion = useRef(0);
  const mutationBusy = useRef(false);
  const lotsRef = useRef(lots);
  const permissionsRef = useRef({ canCreate, canUpdate });
  const proofWrites = useRef<Promise<unknown>>(Promise.resolve());

  lotsRef.current = lots;
  permissionsRef.current = { canCreate, canUpdate };

  const proofKey =
    userId && organizationId
      ? `agritrace_proofs_org_v2:${userId}:${organizationId}`
      : null;

  const refreshLots = async (): Promise<void> => {
    if (!mounted.current || !organizationId) return;
    const version = ++requestVersion.current;
    setIsLoadingLots(true);
    setLotsError(null);

    try {
      const remote = await getLotsByOrganization(organizationId);
      if (!mounted.current || version !== requestVersion.current) return;
      lotsRef.current = remote;
      setLots(remote);
    } catch (error) {
      if (!mounted.current || version !== requestVersion.current) return;
      setLotsError(errorMessage(error));
    } finally {
      if (mounted.current && version === requestVersion.current) {
        setIsLoadingLots(false);
      }
    }
  };

  useEffect(() => {
    mounted.current = true;
    void refreshLots();

    const channel = organizationId
      ? supabase
          .channel(`lots-v2:${userId}:${organizationId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "lots",
              filter: `organization_id=eq.${organizationId}`,
            },
            () => {
              void refreshLots();
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") void refreshLots();
          })
      : null;

    return () => {
      mounted.current = false;
      requestVersion.current += 1;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [organizationId, userId]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      storageGet(MODE_KEY),
      storageGet(LANG_KEY),
      storageGet(THEME_KEY),
    ])
      .then(([savedMode, savedLang, savedTheme]) => {
        if (cancelled) return;
        if (savedMode === "client" || savedMode === "operator") {
          setMode(savedMode);
        }
        if (savedLang === "en" || savedLang === "es") setLang(savedLang);
        if (savedTheme === "light" || savedTheme === "dark") {
          setThemeName(savedTheme);
        }
      })
      .catch((error) => {
        console.warn("[Lots preferences]", errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setPrefsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    void Promise.all([
      storageSet(MODE_KEY, mode),
      storageSet(LANG_KEY, lang),
      storageSet(THEME_KEY, themeName),
    ]).catch((error) => {
      console.warn("[Lots preferences]", errorMessage(error));
    });
  }, [prefsReady, mode, lang, themeName]);

  useEffect(() => {
    let cancelled = false;
    if (!proofKey) {
      setProofsReady(true);
      return;
    }

    void storageGet(proofKey)
      .then((raw) => {
        if (!cancelled) setProofs(parseProofs(raw));
      })
      .catch((error) => {
        console.warn("[Lot proofs]", errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setProofsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [proofKey]);

  useEffect(() => {
    if (!proofKey || !proofsReady) return;
    const serialized = JSON.stringify(proofs);
    proofWrites.current = proofWrites.current
      .then(() => storageSet(proofKey, serialized))
      .catch((error) => {
        console.warn("[Lot proofs]", errorMessage(error));
      });
  }, [proofKey, proofsReady, proofs]);

  const checkAccess = async (operation: "create" | "update") => {
    const allowed =
      operation === "create"
        ? permissionsRef.current.canCreate
        : permissionsRef.current.canUpdate;

    if (!mounted.current || !userId || !organizationId || !allowed) {
      throw new Error("You do not have permission for this lot operation.");
    }

    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!mounted.current || data.user?.id !== userId) {
      throw new Error("Your session changed. Please retry.");
    }

    const stillAllowed =
      operation === "create"
        ? permissionsRef.current.canCreate
        : permissionsRef.current.canUpdate;
    if (!stillAllowed) throw new Error("Your permissions changed.");
  };

  const applyConfirmedLot = (lot: OrganizationLot) => {
    if (!mounted.current || lot.organization_id !== organizationId) return;
    requestVersion.current += 1;
    const next = [
      lot,
      ...lotsRef.current.filter((item) => item.id !== lot.id),
    ].sort(
      (a, b) =>
        (b.createdAt ?? 0) - (a.createdAt ?? 0) ||
        a.id.localeCompare(b.id)
    );
    lotsRef.current = next;
    setLots(next);
    setIsLoadingLots(false);
    setLotsError(null);
  };

  const saveLot = async (lot: Lot): Promise<SaveLotResult> => {
    if (mutationBusy.current) {
      return { ok: false, error: "Another lot operation is in progress." };
    }
    mutationBusy.current = true;

    try {
      await checkAccess("create");
      if (
        lot.organization_id !== organizationId ||
        !lot.harvest_id?.trim()
      ) {
        throw new Error("A harvest from the active organization is required.");
      }

      const photos = await preparePhotos(lot);
      await checkAccess("create");

      const saved = await createOrganizationLot({
        id: lot.id,
        organization_id: organizationId!,
        harvest_id: lot.harvest_id,
        product_en: lot.product_en,
        product_es: lot.product_es,
        origin: lot.origin,
        harvestDate: lot.harvestDate,
        batch: lot.batch,
        notes: lot.notes,
        photos,
      });

      if (!mounted.current) {
        return {
          ok: false,
          error: "Your session changed. Check the catalog before retrying.",
        };
      }
      applyConfirmedLot(saved);
      return { ok: true, lot: saved };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    } finally {
      mutationBusy.current = false;
    }
  };

  const updateLot = async (
    id: string,
    patch: Partial<Lot>
  ): Promise<SaveLotResult> => {
    if (mutationBusy.current) {
      return { ok: false, error: "Another lot operation is in progress." };
    }
    mutationBusy.current = true;

    try {
      await checkAccess("update");
      const lot = lotsRef.current.find(
        (item) => normalizeId(item.id) === normalizeId(id)
      );
      if (!lot || lot.organization_id !== organizationId) {
        throw new Error("This lot is unavailable in your organization.");
      }

      const allowedKeys = new Set([
        "product_en", "product_es", "origin", "harvestDate",
        "batch", "notes", "photos", "is_active", "is_public",
      ]);
      if (Object.keys(patch).some((key) => !allowedKeys.has(key))) {
        throw new Error("The update includes a protected or unsupported field.");
      }

      const input: UpdateLotInput = {};
      if (patch.product_en !== undefined) input.product_en = patch.product_en;
      if (patch.product_es !== undefined) input.product_es = patch.product_es;
      if (patch.origin !== undefined) input.origin = patch.origin;
      if (patch.harvestDate !== undefined) input.harvestDate = patch.harvestDate;
      if (patch.batch !== undefined) input.batch = patch.batch;
      if (Object.prototype.hasOwnProperty.call(patch, "notes")) {
        input.notes = patch.notes ?? null;
      }
      if (patch.is_active !== undefined) input.is_active = patch.is_active;
      if (patch.is_public !== undefined) input.is_public = patch.is_public;
      if (patch.photos !== undefined) {
        input.photos = await preparePhotos({ ...lot, photos: patch.photos });
      }

      await checkAccess("update");
      const saved = await updateOrganizationLot(
        organizationId!,
        lot.id,
        input
      );

      if (!mounted.current) {
        return {
          ok: false,
          error: "Your session changed. Check the catalog before retrying.",
        };
      }
      applyConfirmedLot(saved);
      return { ok: true, lot: saved };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    } finally {
      mutationBusy.current = false;
    }
  };

  const deleteLot = async (_id: string): Promise<void> => {
    throw new Error(
      "Physical deletion is unavailable in V2. Use lot deactivation instead."
    );
  };

  const getLotById = (id: string) =>
    lots.find((lot) => normalizeId(lot.id) === normalizeId(id));

  const clearProofForLot = (id: string) => {
    if (!proofsReady || !mounted.current) return;
    setProofs((previous) => {
      const next = { ...previous };
      delete next[normalizeId(id)];
      return next;
    });
  };

  const value: LotsContextValue = {
    lots,
    isLoadingLots,
    lotsError,
    refreshLots,
    saveLot,
    updateLot,
    deleteLot,
    getLotById,
    addLot: (lot) => {
      void saveLot(lot).then((result) => {
        if (!result.ok) console.warn("[addLot]", result.error);
      });
    },
    resetLots: () => {
      void refreshLots();
    },
    mode,
    enterOperatorWithPin: (pin) => {
      if (pin !== "1616") return false;
      setMode("operator");
      return true;
    },
    exitToClient: () => setMode("client"),
    lang,
    setLang,
    themeName,
    setThemeName,
    proofs,
    getProofByLotId: (id) => proofs[normalizeId(id)],
    setProofForLot: (proof) => {
      if (!proofsReady || !mounted.current || !getLotById(proof.lotId)) return;
      const id = normalizeId(proof.lotId);
      setProofs((previous) => ({
        ...previous,
        [id]: { ...proof, lotId: id },
      }));
    },
    clearProofForLot,
    resetProofs: () => {
      if (proofsReady && mounted.current) setProofs({});
    },
  };

  return <LotsContext.Provider value={value}>{children}</LotsContext.Provider>;
}

export function useLots() {
  const context = useContext(LotsContext);
  if (!context) throw new Error("useLots must be used inside LotsProvider");
  return context;
}
