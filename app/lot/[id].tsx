// app/lot/[id].tsx
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { computeLotHash } from "../hash";
import type { Lang } from "../i18n";
import { t as I18N } from "../i18n";
import { getProductLabel, type Lot } from "../lots";
import { useLots } from "../lots-store";
import { verifyOnStarknetSim, type StarknetSimResult } from "../starknet-sim";
import { storageGet, storageSet } from "../storage";
import { getTheme } from "../theme";

type TT = (typeof I18N)[Lang];

function normalizeId(id: string | string[] | undefined) {
  if (!id) return "";
  return Array.isArray(id) ? id[0] : id;
}

/**
 * ✅ 1 foto por producto (DEMO)
 */
const PRODUCT_PHOTOS: Record<string, any[]> = {
  cacao: [require("../../assets/products/cacao-1.jpg")],
  coffee: [require("../../assets/products/coffee-1.jpg")],
  mango: [require("../../assets/products/mango-1.jpg")],
  hibiscus: [require("../../assets/products/hibiscus-1.jpg")],
};

function getProductPhotos(lot: Lot) {
  const key = `${lot.product_en} ${lot.product_es}`.toLowerCase();
  if (key.includes("cacao")) return PRODUCT_PHOTOS.cacao;
  if (key.includes("coffee")) return PRODUCT_PHOTOS.coffee;
  if (key.includes("mango")) return PRODUCT_PHOTOS.mango;
  if (key.includes("hibiscus")) return PRODUCT_PHOTOS.hibiscus;
  return [];
}

/** ---------------------------
 * ⭐ Reviews + Rating (persist web + mobile)
 * --------------------------*/
type ReviewItem = { id: string; text: string; ts: number };
type ReviewStore = Record<string, { rating: number; reviews: ReviewItem[] }>;
const STORAGE_KEY_REVIEWS = "agritrace_reviews_v1";

function safeParseReviewStore(raw: string | null): ReviewStore {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    return obj as ReviewStore;
  } catch {
    return {};
  }
}

function nowId() {
  return `R-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** ---------------------------
 * ✅ QR Code (web + mobile safe import)
 * --------------------------*/
let QRCodeCmp: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require("react-native-qrcode-svg");
  QRCodeCmp = m?.default ?? m ?? null;
} catch {
  QRCodeCmp = null;
}

/** ---------------------------
 * ✅ Public Base URL helper (NGROK friendly)
 * --------------------------*/
function normalizeBaseUrl(u: string) {
  return u.replace(/\/+$/, "");
}

function getPublicBaseUrl(): string {
  const extra1 = (Constants.expoConfig as any)?.extra?.publicBaseUrl;
  const extra2 = (Constants.manifest as any)?.extra?.publicBaseUrl;
  const raw = extra1 ?? extra2;

  if (typeof raw === "string" && /^https?:\/\//i.test(raw)) {
    return normalizeBaseUrl(raw);
  }

  if (Platform.OS === "web") {
    // @ts-ignore
    const origin = globalThis?.location?.origin ?? "";
    if (origin) return normalizeBaseUrl(origin);
  }

  try {
    const base = Linking.createURL("/");
    return normalizeBaseUrl(base);
  } catch {
    return "";
  }
}

/** ---------------------------
 * ✅ Certificate helpers
 * --------------------------*/
function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(ts?: number) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

/** ---------------------------
 * ✅ WEB ONLY: blob/object URL -> data URL (persists after refresh)
 * --------------------------*/
async function webUriToDataUrl(uri: string): Promise<string> {
  if (!uri) return "";
  if (uri.startsWith("data:")) return uri;

  const res = await fetch(uri);
  const blob = await res.blob();

  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(blob);
  });

  return dataUrl;
}

function cleanUriList(input: any): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((u: any) => String(u ?? "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

export default function LotDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const lotId = normalizeId(params.id);

  const {
    getLotById,
    updateLot,
    lang,
    setLang,
    mode,
    enterOperatorWithPin,
    exitToClient,
    themeName,

    // ✅ proofs (persisted)
    getProofByLotId,
    setProofForLot,
    clearProofForLot,
  } = useLots();

  const tt: TT = I18N[lang];

  const theme = useMemo(() => getTheme(themeName), [themeName]);
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  const lot = (lotId ? getLotById(lotId) : undefined) as Lot | undefined;
  const demoPhotos = useMemo(() => (lot ? getProductPhotos(lot) : []), [lot]);

  // ✅ SINGLE SOURCE OF TRUTH
  const isOperator = mode === "operator";

  // ✅ Uploaded photos from lot (photos?: string[])
  const uploadedPhotos = useMemo(() => {
    const raw = (lot as any)?.photos;
    return cleanUriList(raw).slice(0, 12);
  }, [lot?.id, (lot as any)?.photos]);

  // Optional createdAt stored in lot
  const createdAt = useMemo(() => {
    const ts = (lot as any)?.createdAt;
    return typeof ts === "number" ? ts : undefined;
  }, [lot?.id, (lot as any)?.createdAt]);

  const ui = useMemo(() => {
    return {
      editLot: lang === "es" ? "Editar lote" : "Edit lot",

      // Photos controls (operator)
      managePhotosTitle: lang === "es" ? "Fotos del producto" : "Product photos",
      managePhotosSub:
        lang === "es"
          ? "Fotos reales subidas por el operador. Puedes añadir o quitar fotos."
          : "Real photos uploaded by the operator. You can add or remove photos.",
      uploadPhotos: lang === "es" ? "Subir fotos" : "Upload photos",
      uploading: lang === "es" ? "Procesando…" : "Processing…",
      removePhoto: lang === "es" ? "Quitar" : "Remove",
      noUploadedPhotos:
        lang === "es"
          ? "Aún no hay fotos reales subidas para este lote."
          : "No real photos uploaded yet for this lot.",
      removePhotoQ: lang === "es" ? "Quitar foto" : "Remove photo",
      removePhotoBody:
        lang === "es"
          ? "¿Quieres quitar esta foto del lote?"
          : "Do you want to remove this photo from the lot?",
      removed: lang === "es" ? "Foto removida." : "Photo removed.",
      permDenied:
        lang === "es"
          ? "Permiso denegado. Activa acceso a Fotos en Settings y vuelve a intentar."
          : "Permission denied. Enable Photos access in Settings and try again.",
      pickFailed:
        lang === "es"
          ? "No se pudieron seleccionar fotos."
          : "Could not pick photos.",
      maxPhotos:
        lang === "es" ? "Máximo 12 fotos por lote." : "Max 12 photos per lot.",

      demoPhotosTitle: lang === "es" ? "Fotos (demo)" : "Photos (demo)",
      demoPhotosSub:
        lang === "es"
          ? "Fotos de ejemplo por producto (solo demo)."
          : "Example product photos (demo only).",

      statusTitle: lang === "es" ? "Estado de verificación" : "Verification status",
      statusNotVerified: lang === "es" ? "NO VERIFICADO" : "NOT VERIFIED",
      statusVerified: lang === "es" ? "VERIFICADO" : "VERIFIED",
      statusTampered: lang === "es" ? "MANIPULADO" : "TAMPERED",

      timelineTitle: lang === "es" ? "Timeline de verificación" : "Verification timeline",
      stepCreated: lang === "es" ? "Creado" : "Created",
      stepHashed: lang === "es" ? "Hashed" : "Hashed",
      stepVerified: lang === "es" ? "Verificado" : "Verified",

      tamperedHint:
        lang === "es"
          ? "El lote cambió después de verificarse. Esto indica manipulación o actualización no verificada."
          : "This lot changed after it was verified. This indicates tampering or an unverified update.",
    };
  }, [lang]);

  // ✅ Existing proof from store (persisted)
  const existingProof = useMemo(() => {
    if (!lot) return undefined;
    return getProofByLotId(lot.id);
  }, [lot?.id, getProofByLotId]);

  // ✅ QR value: REAL HTTPS link (NGROK)
  const qrValue = useMemo(() => {
    if (!lot) return "";
    const id = encodeURIComponent(lot.id);

    const base = getPublicBaseUrl();
    if (!base) return "";

    return `${base}/lot/${id}`;
  }, [lot?.id]);

  const qrText = useMemo(() => {
    if (lang === "es") {
      return {
        qrTitle: "QR del lote",
        qrDesc:
          "Escanéalo con la cámara (o con la pantalla de Scan) para abrir este lote.",
        qrMissingLib:
          "QR no disponible: instala react-native-qrcode-svg para mostrar el QR.",
        qrCopy: "Copiar link QR",
        qrCopied: "Copiado",
        qrCopiedBody: "Link del QR copiado:",
      };
    }
    return {
      qrTitle: "Lot QR",
      qrDesc:
        "Scan it with your phone camera (or the Scan screen) to open this lot.",
      qrMissingLib:
        "QR unavailable: install react-native-qrcode-svg to render the QR.",
      qrCopy: "Copy QR link",
      qrCopied: "Copied",
      qrCopiedBody: "QR link copied:",
    };
  }, [lang]);

  const certText = useMemo(() => {
    if (lang === "es") {
      return {
        btnMobile: "Compartir certificado",
        btnWeb: "Descargar certificado",
        title: "Certificado de Trazabilidad",
        subtitle: "AgriTrace • Lote verificado (demo)",
        verified: "VERIFICADO",
        notVerified: "NO VERIFICADO",
        note:
          "Nota: En este MVP, la verificación es una simulación. En producción, el TX reflejará una transacción real en Starknet.",
        printing: "Abriendo impresión…",
        failed: "No se pudo generar el certificado.",
        missing: "Faltan datos del lote para generar el certificado.",
      };
    }
    return {
      btnMobile: "Share certificate",
      btnWeb: "Download certificate",
      title: "Traceability Certificate",
      subtitle: "AgriTrace • Verified lot (demo)",
      verified: "VERIFIED",
      notVerified: "NOT VERIFIED",
      note:
        "Note: In this MVP, verification is simulated. In production, the TX will reflect a real on-chain Starknet transaction.",
      printing: "Opening print…",
      failed: "Could not generate certificate.",
      missing: "Missing lot data to generate certificate.",
    };
  }, [lang]);

  // ✅ PIN overlay
  const [showPinBox, setShowPinBox] = useState(false);
  const [pinInput, setPinInput] = useState("");

  // ⭐ rating + reviews state
  const [rating, setRating] = useState<number>(0);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewText, setReviewText] = useState("");

  // ✅ Hash + Starknet SIM state
  const [hashHex, setHashHex] = useState<string>("—");
  const [hashPayload, setHashPayload] = useState<string>("—");
  const [verifying, setVerifying] = useState(false);
  const [simResult, setSimResult] = useState<StarknetSimResult | null>(null);

  // ✅ Photo upload busy (web conversion)
  const [busyPhotos, setBusyPhotos] = useState(false);

  // ✅ LOAD reviews/rating
  useEffect(() => {
    let mounted = true;
    if (!lotId) return;

    (async () => {
      const raw = await storageGet(STORAGE_KEY_REVIEWS);
      const store = safeParseReviewStore(raw);
      const entry = store[lotId];

      if (!mounted) return;
      setRating(entry?.rating ?? 0);
      setReviews(entry?.reviews ?? []);
    })();

    return () => {
      mounted = false;
    };
  }, [lotId]);

  // ✅ SAVE reviews/rating
  useEffect(() => {
    if (!lotId) return;

    (async () => {
      const raw = await storageGet(STORAGE_KEY_REVIEWS);
      const store = safeParseReviewStore(raw);
      store[lotId] = { rating, reviews };
      await storageSet(STORAGE_KEY_REVIEWS, JSON.stringify(store));
    })();
  }, [lotId, rating, reviews]);

  // ✅ COMPUTE HASH when lot changes
  const photosSignature = useMemo(() => {
    const arr = cleanUriList((lot as any)?.photos);
    return arr.join("|");
  }, [lot?.id, (lot as any)?.photos]);

  useEffect(() => {
    let mounted = true;
    if (!lot) return;

    (async () => {
      try {
        const res = await computeLotHash(lot);
        if (!mounted) return;
        setHashHex(res.hashHex);
        setHashPayload(res.payload);
      } catch {
        if (!mounted) return;
        setHashHex("—");
        setHashPayload("—");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    lot?.id,
    photosSignature,
    (lot as any)?.notes,
    (lot as any)?.batch,
    (lot as any)?.origin,
    (lot as any)?.harvestDate,
    (lot as any)?.product_en,
    (lot as any)?.product_es,
  ]);

  // ✅ Sync UI with stored proof (persisted)
  useEffect(() => {
    if (!lot) return;

    if (existingProof) {
      setSimResult({
        ok: true,
        network: "starknet-sepolia",
        txHash: existingProof.txHash,
        blockNumber: existingProof.blockNumber,
        timestamp: existingProof.ts ?? Date.now(),
        note:
          "Loaded from persisted proof (demo SIM). In production this will reflect an on-chain Starknet transaction.",
      });
    } else {
      setSimResult(null);
    }
  }, [lot?.id, existingProof?.txHash, existingProof?.blockNumber, existingProof?.ts]);

  const goBack = () => router.replace("/catalog");

  const onEditLot = () => {
    if (!lot) return;
    if (!isOperator) return;

    router.push(
      {
        pathname: "/edit-lot/[id]",
        params: { id: lot.id },
      } as any
    );
  };

  /** ✅ Photo picking (Operator only) — PERSISTENT on Web */
  const requestPhotoPermissionIfNeeded = async () => {
    if (Platform.OS === "web") return true;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("AgriTrace", ui.permDenied);
      return false;
    }
    return true;
  };

  const onPickMorePhotos = async () => {
    if (!lot) return;
    if (!isOperator) return;

    try {
      const ok = await requestPhotoPermissionIfNeeded();
      if (!ok) return;

      const current = cleanUriList((lot as any)?.photos).slice(0, 30);
      const remaining = Math.max(0, 12 - current.length);
      if (remaining <= 0) {
        if (Platform.OS === "web") {
          // @ts-ignore
          globalThis?.alert?.(ui.maxPhotos);
        } else {
          Alert.alert("AgriTrace", ui.maxPhotos);
        }
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
        allowsMultipleSelection: true as any,
        selectionLimit: remaining as any,
      });

      if (res.canceled) return;

      const picked = (res.assets ?? [])
        .map((a) => a?.uri)
        .filter((u): u is string => !!u);

      if (picked.length === 0) return;

      if (Platform.OS === "web") {
        setBusyPhotos(true);
        try {
          const converted: string[] = [];
          for (const uri of picked) {
            const dataUrl = await webUriToDataUrl(uri);
            if (dataUrl) converted.push(dataUrl);
          }
          const next = [...current, ...converted].slice(0, 12);
          updateLot(lot.id, { photos: next });
        } finally {
          setBusyPhotos(false);
        }
        return;
      }

      // Native
      const next = [...current, ...picked].slice(0, 12);
      updateLot(lot.id, { photos: next });
    } catch {
      setBusyPhotos(false);
      Alert.alert("AgriTrace", ui.pickFailed);
    }
  };

  const onRemoveUploadedPhoto = (uri: string) => {
    if (!lot) return;
    if (!isOperator) return;

    Alert.alert(ui.removePhotoQ, ui.removePhotoBody, [
      { text: tt.cancel, style: "cancel" },
      {
        text: ui.removePhoto,
        style: "destructive",
        onPress: () => {
          const current = cleanUriList((lot as any)?.photos);
          const next = current.filter((x) => String(x) !== String(uri));
          updateLot(lot.id, { photos: next });

          if (Platform.OS === "web") {
            // @ts-ignore
            globalThis?.alert?.(ui.removed);
          } else {
            Alert.alert(lang === "es" ? "Listo" : "Done", ui.removed);
          }
        },
      },
    ]);
  };

  const onCopyId = async () => {
    if (!lotId) return;
    await Clipboard.setStringAsync(lotId);

    if (Platform.OS === "web") {
      // @ts-ignore
      globalThis?.alert?.(`${tt.copied}: ${lotId}`);
    } else {
      Alert.alert(tt.copied, `${tt.lotIdCopied} ${lotId}`);
    }
  };

  const onCopyQrLink = async () => {
    if (!qrValue) return;
    await Clipboard.setStringAsync(qrValue);

    if (Platform.OS === "web") {
      // @ts-ignore
      globalThis?.alert?.(`${qrText.qrCopied}: ${qrValue}`);
    } else {
      Alert.alert(qrText.qrCopied, `${qrText.qrCopiedBody} ${qrValue}`);
    }
  };

  const onCopyHash = async () => {
    if (!hashHex || hashHex === "—") return;
    await Clipboard.setStringAsync(hashHex);

    const msg = lang === "es" ? `Hash copiado: ${hashHex}` : `Hash copied: ${hashHex}`;
    if (Platform.OS === "web") {
      // @ts-ignore
      globalThis?.alert?.(msg);
    } else {
      Alert.alert(lang === "es" ? "Copiado" : "Copied", msg);
    }
  };

  const onCopyTx = async () => {
    const tx = existingProof?.txHash || simResult?.txHash;
    if (!tx) return;
    await Clipboard.setStringAsync(tx);
    const msg = lang === "es" ? `TX copiado: ${tx}` : `TX copied: ${tx}`;
    if (Platform.OS === "web") {
      // @ts-ignore
      globalThis?.alert?.(msg);
    } else {
      Alert.alert(lang === "es" ? "Copiado" : "Copied", msg);
    }
  };

  const onShare = async () => {
    if (!lot) return;

    const proofLine = existingProof?.txHash
      ? `TX: ${existingProof.txHash}\nBlock: ${existingProof.blockNumber}\n`
      : "";

    const photosLine = uploadedPhotos.length > 0 ? `Photos: ${uploadedPhotos.length}\n` : "";

    const message =
      `AgriTrace Lot\n` +
      `ID: ${lot.id}\n` +
      `Product: ${getProductLabel(lot, lang)}\n` +
      `Origin: ${lot.origin}\n` +
      `Harvest: ${lot.harvestDate}\n` +
      `Batch: ${lot.batch}\n` +
      `Rating: ${rating || 0}/5\n` +
      `Hash: ${hashHex}\n` +
      photosLine +
      proofLine +
      `QR: ${qrValue}`;

    try {
      await Share.share({ message });
    } catch {
      Alert.alert(tt.shareNotAvailable, tt.copyInstead);
    }
  };

  const openPin = () => {
    setPinInput("");
    setShowPinBox(true);
  };

  const cancelPin = () => {
    setPinInput("");
    setShowPinBox(false);
  };

  const confirmPin = () => {
    if (pinInput.length !== 4) {
      Alert.alert(tt.invalidPin, tt.pinMustBe4);
      return;
    }
    const ok = enterOperatorWithPin(pinInput);
    if (!ok) {
      Alert.alert(tt.wrongPin, tt.tryAgain);
      return;
    }
    setShowPinBox(false);
    Alert.alert(tt.operatorEnabled, tt.nowOperator);
  };

  // ⭐ Operator-only rating
  const onSetRating = (n: number) => {
    if (!isOperator) return;
    setRating(n);
  };

  // ✅ Client CAN post reviews
  const onSubmitReview = () => {
    const text = reviewText.trim();
    if (!text) {
      Alert.alert(tt.missingFields, tt.reviewEmpty);
      return;
    }

    const item: ReviewItem = { id: nowId(), text, ts: Date.now() };
    setReviews((prev) => [item, ...prev]);
    setReviewText("");

    if (Platform.OS !== "web") Alert.alert(tt.saved, tt.submitReview);
  };

  // ✅ Only operator can delete reviews
  const onDeleteReview = (reviewId: string) => {
    if (!isOperator) return;

    Alert.alert(tt.deleteReviewQ, tt.deleteReviewBody, [
      { text: tt.cancel, style: "cancel" },
      {
        text: tt.delete,
        style: "destructive",
        onPress: () => setReviews((prev) => prev.filter((r) => r.id !== reviewId)),
      },
    ]);
  };

  const verifyText = useMemo(() => {
    if (lang === "es") {
      return {
        title: "Verificación",
        desc:
          "MVP: este hash se genera localmente. Próxima fase: anclarlo en Starknet (on-chain). (Ahora: simulación).",
        hashTitle: "Hash (SHA-256)",
        copyHash: "Copiar hash",
        verify: verifying ? "Verificando..." : "Verificar en Starknet (Simulado)",
        payloadTitle: "Payload (demo)",
        copied: "Copiado",
        simOk: "Simulación OK",
        tx: "TX",
        net: "Red",
        block: "Bloque",
        verified: "Verificado ✓",
        clearProof: "Borrar verificación",
        verifiedOn: "Verificado el",
        copyTx: "Copiar TX",
      };
    }
    return {
      title: "Verification",
      desc:
        "MVP: this hash is generated locally. Next phase will anchor it on Starknet. (Now: simulation).",
      hashTitle: "Hash (SHA-256)",
      copyHash: "Copy hash",
      verify: verifying ? "Verifying..." : "Verify on Starknet (Simulated)",
      payloadTitle: "Payload (demo)",
      copied: "Copied",
      simOk: "Simulation OK",
      tx: "TX",
      net: "Network",
      block: "Block",
      verified: "Verified ✓",
      clearProof: "Clear verification",
      verifiedOn: "Verified on",
      copyTx: "Copy TX",
    };
  }, [lang, verifying]);

  const onVerifySim = async () => {
    if (!lot || hashHex === "—") return;

    try {
      setVerifying(true);

      const res = await verifyOnStarknetSim({
        lotId: lot.id,
        hashHex,
        payload: hashPayload,
      });

      setSimResult(res);

      // ✅ persist proof in store
      setProofForLot({
        lotId: lot.id,
        hash: hashHex,
        txHash: res.txHash,
        blockNumber: res.blockNumber,
        ts: Date.now(),
      });

      const msg =
        `${verifyText.simOk}\n` +
        `${verifyText.net}: ${res.network}\n` +
        `${verifyText.tx}: ${res.txHash}\n` +
        `${verifyText.block}: ${res.blockNumber}`;

      if (Platform.OS === "web") {
        // @ts-ignore
        globalThis?.alert?.(msg);
      } else {
        Alert.alert(verifyText.simOk, msg);
      }
    } catch {
      const msg = lang === "es" ? "Falló la simulación." : "Simulation failed.";
      if (Platform.OS === "web") {
        // @ts-ignore
        globalThis?.alert?.(msg);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setVerifying(false);
    }
  };

  const onCopyPayload = async () => {
    if (!hashPayload || hashPayload === "—") return;
    await Clipboard.setStringAsync(hashPayload);

    const msg = lang === "es" ? "Payload copiado." : "Payload copied.";
    if (Platform.OS === "web") {
      // @ts-ignore
      globalThis?.alert?.(msg);
    } else {
      Alert.alert(verifyText.copied, msg);
    }
  };

  const onClearProof = () => {
    if (!lot) return;
    if (!isOperator) return;

    clearProofForLot(lot.id);
    setSimResult(null);

    const msg = lang === "es" ? "Verificación borrada." : "Verification cleared.";
    if (Platform.OS === "web") {
      // @ts-ignore
      globalThis?.alert?.(msg);
    } else {
      Alert.alert(lang === "es" ? "Listo" : "Done", msg);
    }
  };

  const verifiedDate = useMemo(() => {
    if (!existingProof?.ts) return "";
    return formatDate(existingProof.ts);
  }, [existingProof?.ts]);

  /** ---------------------------
   * ✅ STATUS + TIMELINE
   * --------------------------*/
  type VerifyStatus = "not_verified" | "verified" | "tampered";

  const status: VerifyStatus = useMemo(() => {
    if (!existingProof?.txHash) return "not_verified";
    if (existingProof?.hash && hashHex !== "—" && existingProof.hash !== hashHex) return "tampered";
    return "verified";
  }, [existingProof?.txHash, existingProof?.hash, hashHex]);

  const statusLabel = useMemo(() => {
    if (status === "verified") return ui.statusVerified;
    if (status === "tampered") return ui.statusTampered;
    return ui.statusNotVerified;
  }, [status, ui.statusVerified, ui.statusTampered, ui.statusNotVerified]);

  const statusDotStyle = useMemo(() => {
    if (status === "verified") return styles.dotVerified;
    if (status === "tampered") return styles.dotTampered;
    return styles.dotNotVerified;
  }, [status, styles.dotVerified, styles.dotTampered, styles.dotNotVerified]);

  const statusPillStyle = useMemo(() => {
    if (status === "verified") return styles.statusVerified;
    if (status === "tampered") return styles.statusTampered;
    return styles.statusNotVerified;
  }, [status, styles.statusVerified, styles.statusTampered, styles.statusNotVerified]);

  const timeline = useMemo(() => {
    const hashedReady = hashHex !== "—";
    const verifiedTs = existingProof?.ts;

    return {
      created: createdAt ? formatDate(createdAt) : "",
      hashed: hashedReady ? (lang === "es" ? "Listo ✓" : "Ready ✓") : "",
      verified: verifiedTs ? formatDate(verifiedTs) : "",
    };
  }, [createdAt, hashHex, existingProof?.ts, lang]);

  /** ---------------------------
   * ✅ Certificate (PDF)
   * --------------------------*/
  const buildCertificateHtml = () => {
    if (!lot) return "";

    const product = getProductLabel(lot, lang);
    const verified = status === "verified";

    const txHash = existingProof?.txHash ?? "";
    const blockNumber =
      typeof existingProof?.blockNumber === "number" ? String(existingProof.blockNumber) : "";
    const vDate = existingProof?.ts ? formatDate(existingProof.ts) : "";

    const badge =
      status === "verified"
        ? certText.verified
        : status === "tampered"
        ? lang === "es"
          ? "MANIPULADO"
          : "TAMPERED"
        : certText.notVerified;

    const tamperedNote =
      status === "tampered"
        ? lang === "es"
          ? "⚠️ Este lote está marcado como MANIPULADO: el hash actual no coincide con el hash verificado."
          : "⚠️ This lot is marked as TAMPERED: current hash does not match verified hash."
        : "";

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AgriTrace Certificate</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #111; }
    .wrap { max-width: 860px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
    .top { padding: 18px 20px; background: #0b1220; color: #fff; display: flex; justify-content: space-between; align-items: center; gap: 14px; }
    .brand { font-weight: 800; letter-spacing: .8px; font-size: 16px; }
    .badge { background: ${
      verified ? "#16a34a" : status === "tampered" ? "#dc2626" : "#6b7280"
    }; color: #fff; padding: 8px 12px; border-radius: 999px; font-weight: 800; letter-spacing: .6px; font-size: 12px; }
    .content { padding: 18px 20px; }
    .h1 { font-size: 22px; font-weight: 900; margin: 0; letter-spacing: .3px; }
    .sub { margin-top: 6px; color: #6b7280; font-weight: 700; }
    .grid { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #fff; }
    .k { color: #6b7280; font-weight: 800; letter-spacing: .2px; font-size: 12px; }
    .v { margin-top: 6px; font-weight: 800; font-size: 14px; word-break: break-word; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; font-weight: 800; }
    .footer { padding: 14px 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-weight: 700; font-size: 12px; line-height: 1.4; }
    .warn { margin-top: 12px; padding: 12px; border-radius: 12px; border: 1px solid #fecaca; background: #fee2e2; color: #7f1d1d; font-weight: 800; }
    .qr { margin-top: 8px; }
    .small { font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="brand">${escapeHtml("AgriTrace")}</div>
      <div class="badge">${escapeHtml(badge)}</div>
    </div>

    <div class="content">
      <p class="h1">${escapeHtml(certText.title)}</p>
      <div class="sub">${escapeHtml(certText.subtitle)}</div>

      ${tamperedNote ? `<div class="warn">${escapeHtml(tamperedNote)}</div>` : ``}

      <div class="grid">
        <div class="box">
          <div class="k">${escapeHtml(lang === "es" ? "Producto" : "Product")}</div>
          <div class="v">${escapeHtml(product)}</div>
        </div>

        <div class="box">
          <div class="k">${escapeHtml(lang === "es" ? "Lote (ID)" : "Lot (ID)")}</div>
          <div class="v mono">${escapeHtml(lot.id)}</div>
        </div>

        <div class="box">
          <div class="k">${escapeHtml(lang === "es" ? "Origen" : "Origin")}</div>
          <div class="v">${escapeHtml(lot.origin)}</div>
        </div>

        <div class="box">
          <div class="k">${escapeHtml(lang === "es" ? "Cosecha" : "Harvest date")}</div>
          <div class="v">${escapeHtml(lot.harvestDate)}</div>
        </div>

        <div class="box">
          <div class="k">${escapeHtml("Batch")}</div>
          <div class="v">${escapeHtml(lot.batch)}</div>
        </div>

        <div class="box">
          <div class="k">${escapeHtml("Rating")}</div>
          <div class="v">${escapeHtml(String(rating || 0))}/5</div>
        </div>

        <div class="box">
          <div class="k">${escapeHtml("Hash (SHA-256)")}</div>
          <div class="v mono">${escapeHtml(hashHex)}</div>
        </div>

        <div class="box">
          <div class="k">${escapeHtml(lang === "es" ? "Verificación" : "Verification")}</div>
          <div class="v small">
            <div><b>${escapeHtml("TX")}:</b> <span class="mono">${escapeHtml(txHash || "-")}</span></div>
            <div><b>${escapeHtml(lang === "es" ? "Bloque" : "Block")}:</b> ${escapeHtml(blockNumber || "-")}</div>
            <div><b>${escapeHtml(lang === "es" ? "Fecha" : "Date")}:</b> ${escapeHtml(vDate || "-")}</div>
          </div>
        </div>
      </div>

      <div class="box qr" style="margin-top:12px;">
        <div class="k">${escapeHtml(lang === "es" ? "Link público (QR)" : "Public link (QR)")}</div>
        <div class="v mono">${escapeHtml(qrValue || "-")}</div>
      </div>
    </div>

    <div class="footer">
      ${escapeHtml(certText.note)}
    </div>
  </div>
</body>
</html>`;
  };

  const onExportCertificate = async () => {
    if (!lot) {
      Alert.alert("AgriTrace", certText.missing);
      return;
    }

    const html = buildCertificateHtml();
    if (!html) {
      Alert.alert("AgriTrace", certText.failed);
      return;
    }

    try {
      if (Platform.OS === "web") {
        // @ts-ignore
        globalThis?.alert?.(certText.printing);
        await Print.printAsync({ html });
        return;
      }

      const file = await Print.printToFileAsync({ html });
      const uri = file?.uri;

      if (!uri) {
        Alert.alert("AgriTrace", certText.failed);
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: lang === "es" ? "Compartir certificado" : "Share certificate",
        });
      } else {
        await Share.share({
          message: lang === "es" ? "Certificado generado." : "Certificate generated.",
          url: uri,
        });
      }
    } catch {
      Alert.alert("AgriTrace", certText.failed);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backBtnText}>← {tt.back}</Text>
        </Pressable>

        <View style={styles.headerRight}>
          {/* Toggle idioma */}
          <View style={styles.langWrap}>
            <Pressable
              onPress={() => setLang("en")}
              style={({ pressed }) => [
                styles.langBtn,
                lang === "en" && styles.langBtnActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>
                EN
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLang("es")}
              style={({ pressed }) => [
                styles.langBtn,
                lang === "es" && styles.langBtnActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.langText, lang === "es" && styles.langTextActive]}>
                ES
              </Text>
            </Pressable>
          </View>

          <Text style={styles.modeBadge}>{isOperator ? tt.operator : tt.client}</Text>

          {isOperator ? (
            <>
              <Pressable
                onPress={onEditLot}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryBtnText}>{ui.editLot}</Text>
              </Pressable>

              <Pressable
                onPress={exitToClient}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryBtnText}>{tt.exit}</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={openPin}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryBtnText}>{tt.enterOperator}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        <Text style={styles.title}>{tt.lotDetailsTitle}</Text>

        {!lotId ? (
          <Text style={styles.errorText}>{tt.missingLotId}</Text>
        ) : !lot ? (
          <Text style={styles.errorText}>
            {tt.lotNotFound} {lotId}
          </Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.bigProduct}>{getProductLabel(lot, lang)}</Text>
            <Text style={styles.badge}>{lot.id}</Text>

            {/* ✅ STATUS */}
            <View style={styles.statusBox}>
              <View style={styles.statusTopRow}>
                <Text style={styles.sectionTitle}>{ui.statusTitle}</Text>

                <View style={[styles.statusPill, statusPillStyle]}>
                  <View style={styles.statusPillInner}>
                    <View style={[styles.statusDot, statusDotStyle]} />
                    <Text style={styles.statusPillText}>{statusLabel}</Text>
                  </View>
                </View>
              </View>

              {status === "tampered" ? (
                <Text style={styles.tamperedHint}>⚠️ {ui.tamperedHint}</Text>
              ) : null}
            </View>

            {/* ✅ TIMELINE */}
            <View style={styles.timelineBox}>
              <Text style={styles.sectionTitle}>{ui.timelineTitle}</Text>

              <View style={styles.timelineRow}>
                <Text style={styles.timelineLabel}>{ui.stepCreated}</Text>
                <Text style={styles.timelineValue}>{timeline.created || "—"}</Text>
              </View>

              <View style={styles.timelineRow}>
                <Text style={styles.timelineLabel}>{ui.stepHashed}</Text>
                <Text style={styles.timelineValue}>{timeline.hashed || "—"}</Text>
              </View>

              <View style={styles.timelineRow}>
                <Text style={styles.timelineLabel}>{ui.stepVerified}</Text>
                <Text style={[styles.timelineValue, status === "tampered" && { color: "#dc2626" }]}>
                  {timeline.verified || "—"}
                </Text>
              </View>
            </View>

            {/* ✅ QR */}
            <View style={styles.qrBox}>
              <Text style={styles.sectionTitle}>{qrText.qrTitle}</Text>
              <Text style={styles.sectionSub}>{qrText.qrDesc}</Text>

              {QRCodeCmp ? (
                <View style={styles.qrWrap}>
                  <QRCodeCmp value={qrValue} size={180} />
                </View>
              ) : (
                <Text style={styles.qrMissing}>{qrText.qrMissingLib}</Text>
              )}

              <View style={styles.qrActions}>
                <Pressable
                  onPress={onCopyQrLink}
                  style={({ pressed }) => [styles.qrBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.qrBtnText}>{qrText.qrCopy}</Text>
                </Pressable>
              </View>

              <Text style={styles.qrValue} numberOfLines={2}>
                {qrValue}
              </Text>
            </View>

            {/* ✅ Photos (REAL uploaded) + controls */}
            <View style={styles.photosSection}>
              <View style={styles.photosHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>{ui.managePhotosTitle}</Text>
                  <Text style={styles.sectionSub}>
                    {ui.managePhotosSub} {ui.maxPhotos}
                  </Text>
                </View>

                {isOperator ? (
                  <Pressable
                    onPress={onPickMorePhotos}
                    disabled={busyPhotos}
                    style={({ pressed }) => [
                      styles.photoActionBtn,
                      pressed && !busyPhotos && styles.pressed,
                      busyPhotos && styles.disabled,
                    ]}
                  >
                    <Text style={styles.photoActionBtnText}>
                      {busyPhotos ? ui.uploading : ui.uploadPhotos}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {uploadedPhotos.length === 0 ? (
                <Text style={styles.emptyPhotos}>{ui.noUploadedPhotos}</Text>
              ) : (
                <View style={styles.photosRow}>
                  {uploadedPhotos.map((uri) => (
                    <View key={uri} style={styles.photoCard}>
                      <Image source={{ uri }} style={styles.photo} />
                      {isOperator ? (
                        <Pressable
                          onPress={() => onRemoveUploadedPhoto(uri)}
                          style={({ pressed }) => [styles.photoRemoveBtn, pressed && styles.pressed]}
                        >
                          <Text style={styles.photoRemoveBtnText}>{ui.removePhoto}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ✅ Demo Photos (optional) */}
            {demoPhotos.length > 0 ? (
              <View style={styles.photosSection}>
                <Text style={styles.sectionTitle}>{ui.demoPhotosTitle}</Text>
                <Text style={styles.sectionSub}>{ui.demoPhotosSub}</Text>

                <View style={styles.photosRow}>
                  {demoPhotos.map((img, idx) => (
                    <View key={idx} style={styles.photoCard}>
                      <Image source={img} style={styles.photo} />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* ⭐ Rating */}
            <View style={styles.ratingBox}>
              <Text style={styles.sectionTitle}>{tt.ratingTitle}</Text>
              <Text style={styles.sectionSub}>{tt.ratingDesc}</Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    disabled={!isOperator}
                    onPress={() => onSetRating(n)}
                    style={({ pressed }) => [
                      styles.starBtn,
                      pressed && isOperator && styles.pressed,
                      !isOperator && styles.disabled,
                    ]}
                  >
                    <Text style={[styles.star, n <= rating ? styles.starOn : styles.starOff]}>
                      ★
                    </Text>
                  </Pressable>
                ))}

                <Text style={styles.ratingValue}>
                  {tt.yourRating}: {rating}/5
                </Text>
              </View>
            </View>

            {/* Lot fields */}
            <View style={styles.row}>
              <Text style={styles.label}>{tt.origin}</Text>
              <Text style={styles.value}>{lot.origin}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{tt.harvestDate}</Text>
              <Text style={styles.value}>{lot.harvestDate}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{tt.batch}</Text>
              <Text style={styles.value}>{lot.batch}</Text>
            </View>

            {lot.notes ? (
              <View style={styles.row}>
                <Text style={styles.label}>{tt.notesOptional}</Text>
                <Text style={styles.value}>{lot.notes}</Text>
              </View>
            ) : null}

            {/* ✅ Verification */}
            <View style={styles.verifyBox}>
              <View style={styles.verifyHeaderRow}>
                <Text style={styles.verifyTitle}>{verifyText.title}</Text>

                {existingProof ? (
                  <View style={styles.verifiedPill}>
                    <Text style={styles.verifiedPillText}>{verifyText.verified}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.verifyText}>{verifyText.desc}</Text>

              {existingProof ? (
                <View style={styles.proofInfo}>
                  <Text style={styles.proofLine}>
                    {verifyText.tx}: {existingProof.txHash}
                  </Text>
                  <Text style={styles.proofLine}>
                    {verifyText.block}: {existingProof.blockNumber}
                  </Text>
                  {verifiedDate ? (
                    <Text style={styles.proofLine}>
                      {verifyText.verifiedOn}: {verifiedDate}
                    </Text>
                  ) : null}

                  <View style={styles.proofActions}>
                    <Pressable
                      onPress={onCopyTx}
                      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.actionBtnText}>{verifyText.copyTx}</Text>
                    </Pressable>

                    {isOperator ? (
                      <Pressable
                        onPress={onClearProof}
                        style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
                      >
                        <Text style={styles.clearBtnText}>{verifyText.clearProof}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={styles.hashRow}>
                <Text style={styles.hashLabel}>{verifyText.hashTitle}</Text>
                <Text style={styles.hashValue} numberOfLines={2}>
                  {hashHex}
                </Text>

                <View style={styles.hashActions}>
                  <Pressable
                    onPress={onCopyHash}
                    style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.actionBtnText}>{verifyText.copyHash}</Text>
                  </Pressable>

                  <Pressable
                    onPress={onVerifySim}
                    disabled={verifying}
                    style={({ pressed }) => [
                      styles.verifyBtn,
                      pressed && !verifying && styles.pressed,
                      verifying && styles.disabled,
                    ]}
                  >
                    <Text style={styles.verifyBtnText}>{verifyText.verify}</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.payloadBox}>
                <Text style={styles.payloadTitle}>{verifyText.payloadTitle}</Text>
                <Text style={styles.payloadText} numberOfLines={6}>
                  {hashPayload}
                </Text>
                <Pressable
                  onPress={onCopyPayload}
                  style={({ pressed }) => [styles.payloadBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.payloadBtnText}>
                    {lang === "es" ? "Copiar payload" : "Copy payload"}
                  </Text>
                </Pressable>
              </View>

              {simResult ? (
                <View style={styles.simBox}>
                  <Text style={styles.simTitle}>
                    {lang === "es" ? "Resultado Simulado" : "Simulated Result"}
                  </Text>
                  <Text style={styles.simLine}>
                    {verifyText.net}: {simResult.network}
                  </Text>
                  <Text style={styles.simLine}>
                    {verifyText.tx}: {simResult.txHash}
                  </Text>
                  <Text style={styles.simLine}>
                    {verifyText.block}: {simResult.blockNumber}
                  </Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  onPress={onExportCertificate}
                  style={({ pressed }) => [styles.certificateBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.certificateBtnText}>
                    {Platform.OS === "web" ? certText.btnWeb : certText.btnMobile}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onCopyId}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.actionBtnText}>{tt.copyId}</Text>
                </Pressable>

                <Pressable
                  onPress={onShare}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.actionBtnText}>{tt.share}</Text>
                </Pressable>
              </View>
            </View>

            {/* Reviews */}
            <View style={styles.reviewsBox}>
              <Text style={styles.sectionTitle}>{tt.reviewsTitle}</Text>

              <TextInput
                style={styles.reviewInput}
                value={reviewText}
                onChangeText={setReviewText}
                placeholder={tt.reviewPlaceholder}
                placeholderTextColor={c.muted}
                multiline
              />

              <View style={styles.reviewActions}>
                <Pressable
                  onPress={onSubmitReview}
                  style={({ pressed }) => [styles.reviewBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.reviewBtnText}>{tt.submitReview}</Text>
                </Pressable>
              </View>

              {reviews.length === 0 ? (
                <Text style={styles.emptyReviews}>{tt.noReviewsYet}</Text>
              ) : (
                <View style={styles.reviewsList}>
                  {reviews.map((r) => (
                    <View key={r.id} style={styles.reviewCard}>
                      <Text style={styles.reviewText}>{r.text}</Text>

                      <View style={styles.reviewFooter}>
                        <Text style={styles.reviewDate}>
                          {new Date(r.ts).toLocaleDateString()}
                        </Text>

                        {isOperator ? (
                          <Pressable
                            onPress={() => onDeleteReview(r.id)}
                            style={({ pressed }) => [styles.reviewDeleteBtn, pressed && styles.pressed]}
                          >
                            <Text style={styles.reviewDeleteText}>{tt.delete}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* PIN overlay */}
      {showPinBox ? (
        <View style={styles.pinOverlay}>
          <Pressable style={styles.pinOverlayBg} onPress={cancelPin} />
          <View style={styles.pinBox}>
            <Text style={styles.pinTitle}>{tt.enterOperatorPinTitle}</Text>

            <TextInput
              style={styles.pinInput}
              placeholder="••••"
              placeholderTextColor={c.muted}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={pinInput}
              onChangeText={(txt) => setPinInput(txt.replace(/[^0-9]/g, ""))}
              autoFocus
            />

            <View style={styles.pinButtonsRow}>
              <Pressable
                onPress={cancelPin}
                style={({ pressed }) => [styles.pinCancelBtn, pressed && styles.pressed]}
              >
                <Text style={styles.pinCancelText}>{tt.cancel}</Text>
              </Pressable>

              <Pressable
                onPress={confirmPin}
                style={({ pressed }) => [styles.pinConfirmBtn, pressed && styles.pressed]}
              >
                <Text style={styles.pinConfirmText}>{tt.confirm}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

type ThemeColors = ReturnType<typeof getTheme>["colors"];

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg, padding: 20 },
    scrollContent: { paddingBottom: 40 },

    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 14,
      gap: 12,
    },

    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: 10,
      maxWidth: 650,
    },

    langWrap: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: c.card,
    },
    langBtn: { paddingVertical: 9, paddingHorizontal: 12 },
    langBtnActive: { backgroundColor: c.segmentBg },
    langText: {
      color: c.muted,
      fontWeight: "900",
      letterSpacing: 0.6,
      fontSize: 12,
    },
    langTextActive: { color: c.text },

    backBtn: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    backBtnText: { color: c.text, fontWeight: "900", letterSpacing: 0.6 },

    modeBadge: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      backgroundColor: c.segmentBg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      fontSize: 12,
    },

    secondaryBtn: {
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    secondaryBtnText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.6,
      fontSize: 12,
    },

    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    disabled: { opacity: 0.55 },

    title: {
      color: c.text,
      fontSize: 34,
      fontWeight: "900",
      letterSpacing: 1,
      marginTop: 2,
    },

    card: {
      marginTop: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      padding: 14,
    },

    bigProduct: {
      color: c.text,
      fontSize: 22,
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    badge: {
      marginTop: 10,
      alignSelf: "flex-start",
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      backgroundColor: c.segmentBg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      fontSize: 12,
    },

    /* ✅ STATUS */
    statusBox: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      borderRadius: 16,
      padding: 12,
      gap: 8,
    },
    statusTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    },
    statusPill: {
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderWidth: 1,
      alignSelf: "flex-start",
    },
    statusPillInner: { flexDirection: "row", alignItems: "center", gap: 8 },
    statusDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: "#999" },
    dotVerified: { backgroundColor: "#22c55e" },
    dotNotVerified: { backgroundColor: "#f59e0b" },
    dotTampered: { backgroundColor: "#ef4444" },
    statusPillText: {
      fontWeight: "900",
      letterSpacing: 0.6,
      fontSize: 12,
      color: "white",
    },
    statusVerified: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
    statusNotVerified: { backgroundColor: "#6b7280", borderColor: "#6b7280" },
    statusTampered: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
    tamperedHint: {
      color: "#dc2626",
      fontWeight: "900",
      letterSpacing: 0.2,
      lineHeight: 18,
    },

    /* ✅ TIMELINE */
    timelineBox: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      borderRadius: 16,
      padding: 12,
      gap: 8,
    },
    timelineRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    timelineLabel: { color: c.text, fontWeight: "900", letterSpacing: 0.2 },
    timelineValue: { color: c.muted, fontWeight: "900", letterSpacing: 0.2 },

    qrBox: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      borderRadius: 16,
      padding: 12,
    },
    qrWrap: {
      marginTop: 12,
      alignSelf: "center",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: c.card,
      padding: 12,
    },
    qrMissing: {
      marginTop: 10,
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    qrActions: {
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    qrBtn: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    qrBtnText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 12,
    },
    qrValue: {
      marginTop: 10,
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.2,
    },

    photosSection: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      borderRadius: 16,
      padding: 12,
    },
    photosHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    photoActionBtn: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    photoActionBtnText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 12,
    },
    emptyPhotos: {
      marginTop: 10,
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.2,
    },

    photosRow: {
      marginTop: 12,
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
    },
    photoCard: {
      width: 150,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    photo: { width: "100%", height: 150, resizeMode: "cover" },
    photoRemoveBtn: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.segmentBg,
      paddingVertical: 8,
      alignItems: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    photoRemoveBtnText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.3,
      fontSize: 12,
    },

    ratingBox: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      borderRadius: 16,
      padding: 12,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    sectionSub: {
      marginTop: 6,
      color: c.muted,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    starsRow: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
    },
    starBtn: { paddingHorizontal: 2, paddingVertical: 2 },
    star: { fontSize: 22, fontWeight: "900" },
    starOn: { color: c.green },
    starOff: { color: c.muted },
    ratingValue: {
      marginLeft: 8,
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.2,
    },

    row: { marginTop: 12 },
    label: {
      color: c.muted,
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 12,
    },
    value: { marginTop: 6, color: c.text, fontSize: 14, letterSpacing: 0.2 },

    verifyBox: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      borderRadius: 16,
      padding: 12,
    },
    verifyHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    verifyTitle: {
      color: c.text,
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 0.6,
    },
    verifyText: {
      marginTop: 6,
      color: c.muted,
      fontWeight: "700",
      letterSpacing: 0.2,
    },

    verifiedPill: {
      backgroundColor: c.green,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: c.green,
    },
    verifiedPillText: {
      color: "white",
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 12,
    },

    proofInfo: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 10,
      gap: 6,
    },
    proofLine: { color: c.muted, fontWeight: "800", letterSpacing: 0.2 },
    proofActions: {
      marginTop: 8,
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
    },

    hashRow: { marginTop: 12, gap: 8 },
    hashLabel: { color: c.text, fontWeight: "900", letterSpacing: 0.3 },
    hashValue: { color: c.muted, fontWeight: "800", letterSpacing: 0.2 },

    hashActions: {
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
      marginTop: 6,
    },

    actionBtn: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    actionBtnText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.6,
      fontSize: 12,
    },

    clearBtn: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    clearBtnText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.6,
      fontSize: 12,
    },

    verifyBtn: {
      backgroundColor: c.green,
      borderColor: c.green,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    verifyBtnText: {
      color: "white",
      fontWeight: "900",
      letterSpacing: 0.6,
      fontSize: 12,
    },

    certificateBtn: {
      backgroundColor: c.green,
      borderColor: c.green,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    certificateBtnText: {
      color: "white",
      fontWeight: "900",
      letterSpacing: 0.6,
      fontSize: 12,
    },

    payloadBox: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 10,
      gap: 8,
    },
    payloadTitle: { color: c.text, fontWeight: "900", letterSpacing: 0.4 },
    payloadText: {
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.2,
      lineHeight: 18,
    },
    payloadBtn: {
      alignSelf: "flex-end",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    payloadBtnText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 12,
    },

    simBox: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 10,
      gap: 6,
    },
    simTitle: { color: c.text, fontWeight: "900", letterSpacing: 0.4 },
    simLine: { color: c.muted, fontWeight: "800", letterSpacing: 0.2 },

    actions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 14,
      flexWrap: "wrap",
    },

    errorText: {
      marginTop: 10,
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.3,
    },

    reviewsBox: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      borderRadius: 16,
      padding: 12,
    },
    reviewInput: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      color: c.text,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      minHeight: 54,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    reviewActions: {
      marginTop: 10,
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    reviewBtn: {
      backgroundColor: c.green,
      borderColor: c.green,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    reviewBtnText: {
      color: "white",
      fontWeight: "900",
      letterSpacing: 0.6,
      fontSize: 12,
    },
    emptyReviews: {
      marginTop: 10,
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    reviewsList: { marginTop: 10, gap: 10 },
    reviewCard: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 10,
    },
    reviewText: {
      color: c.text,
      fontWeight: "800",
      letterSpacing: 0.2,
      lineHeight: 18,
    },
    reviewFooter: {
      marginTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    reviewDate: {
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.2,
      fontSize: 12,
    },
    reviewDeleteBtn: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    reviewDeleteText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 12,
    },

    pinOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    pinOverlayBg: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    pinBox: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      padding: 14,
    },
    pinTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    pinInput: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      color: c.text,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 6,
      textAlign: "center",
    },
    pinButtonsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 12,
    },
    pinCancelBtn: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
    pinCancelText: { color: c.text, fontWeight: "900", letterSpacing: 0.6 },
    pinConfirmBtn: {
      backgroundColor: c.green,
      borderWidth: 1,
      borderColor: c.green,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
    pinConfirmText: { color: "white", fontWeight: "900", letterSpacing: 0.6 },
  });
