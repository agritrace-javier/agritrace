// app/catalog.tsx
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { computeLotHash } from "./hash";
import type { Lang } from "./i18n";
import { t as I18N } from "./i18n";
import type { Lot } from "./lots";
import { getProductLabel } from "./lots";
import { useLots } from "./lots-store";
import { getLotThumbnail } from "./product-photos";
import { getTheme } from "./theme";

type TT = (typeof I18N)[Lang];
type VerifyState = "not_verified" | "verified" | "tampered" | "checking";

function safeString(v: any) {
  return String(v ?? "").trim();
}

// ✅ RN Web event helper (best effort)
function stopEvt(e: any) {
  try {
    e?.preventDefault?.();
  } catch {}
  try {
    e?.stopPropagation?.();
  } catch {}
}

export default function CatalogScreen() {
  const router = useRouter();

  const {
    lots,
    deleteLot,
    mode,
    lang,
    themeName,

    proofs,
    getProofByLotId,
    clearProofForLot,
  } = useLots();

  const tt: TT = I18N[lang];

  const theme = useMemo(() => getTheme(themeName), [themeName]);
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  const isOperator = mode === "operator";

  const v = useMemo(() => {
    if (lang === "es") {
      return {
        verified: "Verificado",
        notVerified: "No verificado",
        tampered: "Alterado",
        checking: "Verificando…",

        clear: "Quitar",
        clearTitle: "Quitar verificación",
        clearBody: "Esto borrará el proof guardado para este lote. ¿Seguro?",
        cancel: "Cancelar",
        ok: "Sí, quitar",
        cleared: "Verificación borrada",

        img: "IMG",

        // ✅ delete strings fallback
        delTitle: "Borrar lote",
        delBody: "¿Seguro que quieres borrar este lote?",
        delYes: "Sí, borrar",
        delNo: "Cancelar",
        delDone: "Lote borrado",
      };
    }
    return {
      verified: "Verified",
      notVerified: "Not Verified",
      tampered: "Tampered",
      checking: "Checking…",

      clear: "Clear",
      clearTitle: "Clear verification",
      clearBody: "This will delete the saved proof for this lot. Are you sure?",
      cancel: "Cancel",
      ok: "Yes, clear",
      cleared: "Verification cleared",

      img: "IMG",

      // ✅ delete strings fallback
      delTitle: "Delete lot",
      delBody: "Are you sure you want to delete this lot?",
      delYes: "Yes, delete",
      delNo: "Cancel",
      delDone: "Lot deleted",
    };
  }, [lang]);

  const onOpenLot = (id: string) => {
    router.push({ pathname: "/lot/[id]", params: { id } } as any);
  };

  const onGoCreate = () => {
    if (!isOperator) return;
    router.push("/create-lot");
  };

  const onDelete = async (id: string) => {
    if (!isOperator) return;

    // Prefer your i18n if exists; otherwise fall back
    const title = (tt as any)?.deleteLotQ || v.delTitle;
    const bodyBase = (tt as any)?.deleteLotBody || v.delBody;
    const cancelText = (tt as any)?.cancel || v.delNo;
    const deleteText = (tt as any)?.delete || v.delYes;
    const deletedText = (tt as any)?.deleted || v.delDone;
    const removedFromCatalog = (tt as any)?.removedFromCatalog || "";

    // ✅ WEB: Use native confirm (Alert.alert is unreliable on web)
    if (Platform.OS === "web") {
      // @ts-ignore
      const ok = globalThis?.confirm?.(`${bodyBase}\n\nID: ${id}`) ?? false;
      if (!ok) return;

      await Promise.resolve(deleteLot(id));

      // optional hygiene
      try {
        clearProofForLot(id);
      } catch {}

      // @ts-ignore
      globalThis?.alert?.(`${deletedText}: ${id}`);
      return;
    }

    // ✅ MOBILE: Alert.alert works well
    Alert.alert(title, `${bodyBase}\n\nID: ${id}`, [
      { text: cancelText, style: "cancel" },
      {
        text: deleteText,
        style: "destructive",
        onPress: async () => {
          await Promise.resolve(deleteLot(id));
          try {
            clearProofForLot(id);
          } catch {}

          Alert.alert(
            deletedText,
            removedFromCatalog ? `${id} ${removedFromCatalog}` : id
          );
        },
      },
    ]);
  };

  const onClearVerified = (lotId: string) => {
    if (!isOperator) return;

    // ✅ WEB: confirm
    if (Platform.OS === "web") {
      // @ts-ignore
      const ok = globalThis?.confirm?.(v.clearBody) ?? false;
      if (!ok) return;
      clearProofForLot(lotId);
      // @ts-ignore
      globalThis?.alert?.(`${v.cleared}: ${lotId}`);
      return;
    }

    // ✅ MOBILE: Alert.alert
    Alert.alert(v.clearTitle, v.clearBody, [
      { text: v.cancel, style: "cancel" },
      {
        text: v.ok,
        style: "destructive",
        onPress: () => {
          clearProofForLot(lotId);
          Alert.alert(v.cleared, lotId);
        },
      },
    ]);
  };

  const getUploadedThumbUri = (lot: Lot): string => {
    const arr = (lot as any)?.photos;
    if (!Array.isArray(arr) || arr.length === 0) return "";
    const u = safeString(arr[0]);
    return u || "";
  };

  const getDemoThumbSafe = (lot: Lot) => {
    try {
      return getLotThumbnail(lot);
    } catch {
      return null;
    }
  };

  const [verifyStateById, setVerifyStateById] = useState<Record<string, VerifyState>>(
    {}
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      const next: Record<string, VerifyState> = {};

      for (const lot of lots) {
        const proof = getProofByLotId(lot.id);
        next[lot.id] = proof ? "checking" : "not_verified";
      }
      if (alive) setVerifyStateById(next);

      const updates: Record<string, VerifyState> = { ...next };

      for (const lot of lots) {
        const proof = getProofByLotId(lot.id);
        if (!proof) continue;

        try {
          const { hashHex } = await computeLotHash(lot);
          updates[lot.id] = hashHex === proof.hash ? "verified" : "tampered";
        } catch {
          updates[lot.id] = "tampered";
        }
      }

      if (alive) setVerifyStateById(updates);
    })();

    return () => {
      alive = false;
    };
  }, [lots, proofs, getProofByLotId]);

  const badgeFor = (state: VerifyState) => {
    switch (state) {
      case "verified":
        return {
          label: `${v.verified} ✓`,
          dotStyle: styles.dotGreen,
          textStyle: styles.badgeTextGreen,
          frameStyle: styles.badgeFrameDefault,
        };
      case "tampered":
        return {
          label: `⚠ ${v.tampered}`,
          dotStyle: styles.dotRed,
          textStyle: styles.badgeTextRed,
          frameStyle: styles.badgeFrameDanger,
        };
      case "checking":
        return {
          label: v.checking,
          dotStyle: styles.dotYellow,
          textStyle: styles.badgeTextYellow,
          frameStyle: styles.badgeFrameDefault,
        };
      case "not_verified":
      default:
        return {
          label: v.notVerified,
          dotStyle: styles.dotYellow,
          textStyle: styles.badgeTextYellow,
          frameStyle: styles.badgeFrameDefault,
        };
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.replace("/")}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backBtnText}>← {tt.back}</Text>
        </Pressable>

        <View style={styles.headerRight}>
          <Text style={styles.title}>{tt.catalogTitle}</Text>

          <View style={styles.pillsRow}>
            <Text style={styles.countPill}>
              {lots.length} {tt.lotsCount}
            </Text>

            {isOperator ? (
              <Pressable
                onPress={onGoCreate}
                style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}
              >
                <Text style={styles.createBtnText}>{tt.createLot}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <Text style={styles.sub}>{tt.catalogSub}</Text>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator>
        {lots.map((lot) => {
          const uploadedUri = getUploadedThumbUri(lot);
          const demoThumb = getDemoThumbSafe(lot);

          let productLabel = "";
          try {
            productLabel = getProductLabel(lot, lang);
          } catch {
            productLabel =
              safeString((lot as any)?.product_en) ||
              safeString((lot as any)?.product_es) ||
              "—";
          }

          const state = verifyStateById[lot.id] ?? "not_verified";
          const badge = badgeFor(state);

          const proof = getProofByLotId(lot.id);
          const hasProof = !!proof?.txHash;

          const hasUploaded = !!uploadedUri;
          const hasDemo = !!demoThumb;

          return (
            <Pressable
              key={lot.id}
              onPress={() => onOpenLot(lot.id)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={[styles.badgeCorner, badge.frameStyle]}>
                <View style={[styles.dot, badge.dotStyle]} />
                <Text style={[styles.badgeTextBase, badge.textStyle]} numberOfLines={1}>
                  {badge.label}
                </Text>

                {isOperator && hasProof ? (
                  <Pressable
                    onPressIn={(e) => stopEvt(e)}
                    onPress={(e) => {
                      stopEvt(e);
                      onClearVerified(lot.id);
                    }}
                    style={({ pressed }) => [styles.clearVerifiedBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.clearVerifiedText}>{v.clear}</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.thumbWrap}>
                {hasUploaded ? (
                  <Image source={{ uri: uploadedUri }} style={styles.thumb} />
                ) : hasDemo ? (
                  <Image source={demoThumb as any} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Text style={styles.thumbPlaceholderText}>{v.img}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.product} numberOfLines={1}>
                    {productLabel}
                  </Text>
                  <Text style={styles.idBadge}>{lot.id}</Text>
                </View>

                <Text style={styles.meta} numberOfLines={1}>
                  {tt.origin}: {lot.origin}
                </Text>

                <Text style={styles.meta} numberOfLines={1}>
                  {tt.harvestDate}: {lot.harvestDate} • {tt.batch}: {lot.batch}
                </Text>

                <View style={styles.rowBottom}>
                  <Text style={styles.openHint}>{tt.openDetailsHint}</Text>

                  {isOperator ? (
                    <Pressable
                      onPressIn={(e) => stopEvt(e)}
                      onPress={(e) => {
                        stopEvt(e);
                        onDelete(lot.id);
                      }}
                      style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.deleteBtnText}>{tt.delete}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

type ThemeColors = ReturnType<typeof getTheme>["colors"];

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg, padding: 20 },

    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 10,
    },
    headerRight: { flex: 1, alignItems: "flex-end", gap: 8 },

    pillsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    },

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

    pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

    title: { color: c.text, fontSize: 28, fontWeight: "900", letterSpacing: 1 },
    sub: {
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.2,
      marginBottom: 12,
    },

    countPill: {
      alignSelf: "flex-end",
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

    createBtn: {
      backgroundColor: c.green,
      borderColor: c.green,
      borderWidth: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    createBtnText: {
      color: "white",
      fontWeight: "900",
      letterSpacing: 0.6,
      fontSize: 12,
    },

    list: { gap: 12, paddingBottom: 30 },

    card: {
      flexDirection: "row",
      gap: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      padding: 12,
      alignItems: "center",
      position: "relative",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },

    badgeCorner: {
      position: "absolute",
      top: 10,
      right: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      zIndex: 5,
      maxWidth: "90%",
      backgroundColor: c.segmentBg,
    },
    badgeFrameDefault: { backgroundColor: c.segmentBg },
    badgeFrameDanger: { backgroundColor: c.dangerBg, borderColor: c.red },

    dot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
    },
    dotGreen: { backgroundColor: c.green },
    dotYellow: { backgroundColor: c.yellow },
    dotRed: { backgroundColor: c.red },

    badgeTextBase: {
      fontWeight: "900",
      letterSpacing: 0.35,
      fontSize: 12,
      maxWidth: 180,
    },
    badgeTextGreen: { color: c.green },
    badgeTextYellow: { color: c.yellow },
    badgeTextRed: { color: c.red },

    clearVerifiedBtn: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    clearVerifiedText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.3,
      fontSize: 12,
    },

    thumbWrap: {
      width: 84,
      height: 84,
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
    },
    thumb: { width: "100%", height: "100%", resizeMode: "cover" },
    thumbPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
    thumbPlaceholderText: { color: c.muted, fontWeight: "900", letterSpacing: 1 },

    cardBody: { flex: 1, gap: 6 },

    rowTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    product: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 0.3,
      flex: 1,
      paddingRight: 6,
    },

    idBadge: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      backgroundColor: c.segmentBg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 5,
      paddingHorizontal: 9,
      borderRadius: 999,
      fontSize: 11,
    },

    meta: { color: c.muted, fontWeight: "800", letterSpacing: 0.2 },

    rowBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    openHint: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 12,
    },

    deleteBtn: {
      backgroundColor: c.segmentBg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    deleteBtnText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 12,
    },
  });
