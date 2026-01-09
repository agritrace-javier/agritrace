// app/catalog.tsx
import { useRouter } from "expo-router";
import { useMemo } from "react";
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
import type { Lang } from "./i18n";
import { t as I18N } from "./i18n";
import { getProductLabel } from "./lots";
import { useLots } from "./lots-store";
import { getLotThumbnail } from "./product-photos";
import { getTheme } from "./theme";

type TT = (typeof I18N)[Lang];

export default function CatalogScreen() {
  const router = useRouter();

  const {
    lots,
    deleteLot,
    mode,
    lang,
    themeName,

    // ✅ proofs
    getProofByLotId,
    clearProofForLot,
  } = useLots();

  const tt: TT = I18N[lang];

  const theme = useMemo(() => getTheme(themeName), [themeName]);
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  const isOperator = mode === "operator";

  // Local strings just for the badge / clear action (safe if i18n doesn't have them)
  const v = useMemo(() => {
    if (lang === "es") {
      return {
        verified: "Verificado ✓",
        clear: "Quitar",
        clearTitle: "Quitar verificación",
        clearBody: "Esto borrará el proof guardado para este lote. ¿Seguro?",
        cancel: "Cancelar",
        ok: "Sí, quitar",
        cleared: "Verificación borrada",
      };
    }
    return {
      verified: "Verified ✓",
      clear: "Clear",
      clearTitle: "Clear verification",
      clearBody: "This will delete the saved proof for this lot. Are you sure?",
      cancel: "Cancel",
      ok: "Yes, clear",
      cleared: "Verification cleared",
    };
  }, [lang]);

  const onOpenLot = (id: string) => {
    router.push({ pathname: "/lot/[id]", params: { id } } as any);
  };

  const onGoCreate = () => {
    if (mode !== "operator") return;
    router.push("/create-lot");
  };

  const onDelete = (id: string) => {
    if (mode !== "operator") return;

    Alert.alert(tt.deleteLotQ, `${tt.deleteLotBody} ${id}`, [
      { text: tt.cancel, style: "cancel" },
      {
        text: tt.delete,
        style: "destructive",
        onPress: () => {
          deleteLot(id);

          if (Platform.OS === "web") {
            // @ts-ignore
            globalThis?.alert?.(`${tt.deleted}: ${id}`);
          } else {
            Alert.alert(tt.deleted, `${id} ${tt.removedFromCatalog}`);
          }
        },
      },
    ]);
  };

  const onClearVerified = (lotId: string) => {
    if (!isOperator) return;

    Alert.alert(v.clearTitle, v.clearBody, [
      { text: v.cancel, style: "cancel" },
      {
        text: v.ok,
        style: "destructive",
        onPress: () => {
          clearProofForLot(lotId);

          if (Platform.OS === "web") {
            // @ts-ignore
            globalThis?.alert?.(`${v.cleared}: ${lotId}`);
          } else {
            Alert.alert(v.cleared, lotId);
          }
        },
      },
    ]);
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

            {mode === "operator" ? (
              <Pressable
                onPress={onGoCreate}
                style={({ pressed }) => [
                  styles.createBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.createBtnText}>{tt.createLot}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <Text style={styles.sub}>{tt.catalogSub}</Text>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={true}
      >
        {lots.map((lot) => {
          const thumb = getLotThumbnail(lot);
          const productLabel = getProductLabel(lot, lang);

          const proof = getProofByLotId ? getProofByLotId(lot.id) : undefined;
          const isVerified = !!proof?.txHash;

          return (
            <Pressable
              key={lot.id}
              onPress={() => onOpenLot(lot.id)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              {/* ✅ Verified badge pinned top-right */}
              {isVerified ? (
                <View style={styles.verifiedCorner}>
                  <Text style={styles.verifiedText}>{v.verified}</Text>

                  {isOperator ? (
                    <Pressable
                      onPress={(e) => {
                        // @ts-ignore
                        e?.stopPropagation?.();
                        onClearVerified(lot.id);
                      }}
                      style={({ pressed }) => [
                        styles.clearVerifiedBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.clearVerifiedText}>{v.clear}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.thumbWrap}>
                {thumb ? (
                  <Image source={thumb as any} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Text style={styles.thumbPlaceholderText}>IMG</Text>
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

                  {mode === "operator" ? (
                    <Pressable
                      onPress={(e) => {
                        // @ts-ignore
                        e?.stopPropagation?.();
                        onDelete(lot.id);
                      }}
                      style={({ pressed }) => [
                        styles.deleteBtn,
                        pressed && styles.pressed,
                      ]}
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

    // ✅ corner badge (top-right)
    verifiedCorner: {
      position: "absolute",
      top: 10,
      right: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.segmentBg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      zIndex: 5,
    },
    verifiedText: {
      color: c.green,
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 12,
    },
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
