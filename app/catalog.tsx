import { Redirect, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { useAuth } from "../src/features/auth";
import { computeLotHash } from "./hash";
import { t as I18N } from "./i18n";
import { getProductLabel } from "./lots";
import type { Lot } from "./lots";
import { useLots } from "./lots-store";
import { getLotThumbnail } from "./product-photos";
import { colors, spacing, radius, typography, layout } from "../src/theme/tokens";

type VerifyState = "not_verified" | "verified" | "tampered" | "checking";

function stopEvt(event: {
  preventDefault?: () => void;
  stopPropagation?: () => void;
}) {
  event.preventDefault?.();
  event.stopPropagation?.();
}

export default function CatalogScreen() {
  const router = useRouter();
  const {
    isLoading,
    isAuthenticated,
    hasActiveMembership,
    organization,
    can,
  } = useAuth();
  const {
    lots,
    updateLot,
    isLoadingLots,
    lotsError,
    refreshLots,
    lang,
    proofs,
    clearProofForLot,
  } = useLots();

  const tt = I18N[lang];
  const c = {
    green: colors.brand.primary,
    red: colors.light.error,
    yellow: colors.light.warning,
  };
  const es = lang === "es";
  const canCreate = hasActiveMembership && can("lots.create");
  const canUpdate = hasActiveMembership && can("lots.update");
  const canClearProof = hasActiveMembership && can("verification.perform");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [verifyStates, setVerifyStates] =
    useState<Record<string, VerifyState>>({});

  const busyRef = useRef(false);
  const aliveRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const next: Record<string, VerifyState> = {};

    for (const lot of lots) {
      next[lot.id] = proofs[lot.id] ? "checking" : "not_verified";
    }
    setVerifyStates(next);

    void (async () => {
      const completed = { ...next };
      for (const lot of lots) {
        if (cancelled) return;
        const proof = proofs[lot.id];
        if (!proof) continue;
        try {
          const { hashHex } = await computeLotHash(lot);
          completed[lot.id] =
            hashHex === proof.hash ? "verified" : "tampered";
        } catch {
          completed[lot.id] = "tampered";
        }
      }
      if (!cancelled) setVerifyStates(completed);
    })();

    return () => {
      cancelled = true;
    };
  }, [lots, proofs]);

  const confirmAction = (
    title: string,
    body: string,
    label: string,
    action: () => void
  ) => {
    if (Platform.OS === "web") {
      const browser = globalThis as unknown as {
        confirm?: (message: string) => boolean;
      };
      if (browser.confirm?.(`${title}\n\n${body}`)) action();
      return;
    }
    Alert.alert(title, body, [
      { text: es ? "Cancelar" : "Cancel", style: "cancel" },
      { text: label, onPress: action },
    ]);
  };

  const changeStatus = async (lot: Lot) => {
    if (
      !aliveRef.current ||
      busyRef.current ||
      !canUpdate ||
      lot.organization_id !== organization?.id
    ) {
      return;
    }

    busyRef.current = true;
    setBusyId(lot.id);
    setActionError(null);

    try {
      const result = await updateLot(lot.id, {
        is_active: lot.is_active === false,
      });
      if (!aliveRef.current) return;
      if (!result.ok) setActionError(result.error);
    } catch {
      if (aliveRef.current) {
        setActionError(
          es ? "No se pudo actualizar el lote." : "Could not update the lot."
        );
      }
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setBusyId(null);
    }
  };

  const onChangeStatus = (lot: Lot) => {
    if (!canUpdate || busyRef.current) return;
    const activate = lot.is_active === false;
    const label = activate
      ? es ? "Activar" : "Activate"
      : es ? "Desactivar" : "Deactivate";

    confirmAction(
      `${label}: ${lot.id}`,
      es
        ? "El registro y su trazabilidad se conservarán."
        : "The record and its traceability will be preserved.",
      label,
      () => {
        void changeStatus(lot);
      }
    );
  };

  const onClearProof = (lot: Lot) => {
    if (!canClearProof || busyRef.current) return;
    confirmAction(
      es ? "Quitar verificación local" : "Clear local verification",
      es
        ? `Se quitará la prueba local de ${lot.id}.`
        : `The local proof for ${lot.id} will be cleared.`,
      es ? "Quitar" : "Clear",
      () => {
        if (aliveRef.current) clearProofForLot(lot.id);
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.page}>
        <ActivityIndicator />
        <Text style={styles.sub}>
          {es ? "Cargando sesión..." : "Loading session..."}
        </Text>
      </View>
    );
  }
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!hasActiveMembership || !organization) {
    return <Redirect href="/organization-setup" />;
  }

  const activeCount = lots.filter((lot) => lot.is_active !== false).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/dashboard")}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>{tt.back}</Text>
        </Pressable>

        <View style={styles.headerRight}>
          <Text style={styles.eyebrow}>
            {es ? "GESTIÓN DE LOTES" : "LOT MANAGEMENT"}
          </Text>
          <Text style={styles.title}>{es ? "Lotes" : "Lots"}</Text>
          <View style={styles.pillsRow}>
            <Text style={styles.countPill}>
              {lots.length} {tt.lotsCount}
            </Text>
            {canCreate ? (
              <Pressable
                accessibilityRole="button"
                disabled={busyId !== null}
                onPress={() => {
                  if (!busyRef.current) router.push("/create-lot");
                }}
                style={styles.createBtn}
              >
                <Text style={styles.createBtnText}>{tt.createLot}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <Text style={styles.sub}>
        {organization.name}
        {"\n"}
        {es
          ? "Lotes vinculados a sus cosechas de origen."
          : "Lots linked to their source harvests."}
      </Text>

      <View style={styles.summary}>
        {[
          { label: es ? "Registrados" : "Registered", value: lots.length },
          { label: es ? "Activos" : "Active", value: activeCount },
          { label: es ? "Inactivos" : "Inactive", value: lots.length - activeCount },
        ].map((item) => (
          <View key={item.label} style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {isLoadingLots || lotsError ? "—" : item.value}
            </Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {actionError ? (
        <Text accessibilityRole="alert" style={[styles.sub, { color: c.red }]}>
          {actionError}
        </Text>
      ) : null}

      {isLoadingLots ? (
        <View>
          <ActivityIndicator />
          <Text style={styles.sub}>
            {es ? "Cargando lotes..." : "Loading lots..."}
          </Text>
        </View>
      ) : lotsError ? (
        <View>
          <Text accessibilityRole="alert" style={[styles.sub, { color: c.red }]}>
            {lotsError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refreshLots()}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>
              {es ? "Reintentar" : "Retry"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {lots.length === 0 ? (
            <Text style={styles.sub}>
              {es
                ? "Todavía no hay lotes registrados en esta organización."
                : "No lots have been registered in this organization yet."}
            </Text>
          ) : null}

          {lots.map((lot) => {
            const uploaded = lot.photos?.[0]?.trim();
            const thumbnail = getLotThumbnail(lot);
            const state = verifyStates[lot.id] ?? "not_verified";
            const label =
              state === "verified"
                ? es ? "Verificado" : "Verified"
                : state === "tampered"
                  ? es ? "Alterado" : "Tampered"
                  : state === "checking"
                    ? es ? "Verificando..." : "Checking..."
                    : es ? "No verificado" : "Not verified";
            const badgeColor =
              state === "verified" ? c.green :
                state === "tampered" ? c.red : c.yellow;
            const active = lot.is_active !== false;

            return (
              <Pressable
                key={lot.id}
                accessibilityRole="button"
                disabled={busyId !== null}
                onPress={() =>
                  router.push({
                    pathname: "/lot/[id]",
                    params: { id: lot.id },
                  })
                }
                style={styles.card}
              >
                <View style={styles.thumbWrap}>
                  {uploaded ? (
                    <Image source={{ uri: uploaded }} style={styles.thumb} />
                  ) : thumbnail ? (
                    <Image source={thumbnail} style={styles.thumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Text style={styles.thumbPlaceholderText}>IMG</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.product}>
                      {getProductLabel(lot, lang)}
                    </Text>
                    <Text style={styles.idBadge}>{lot.id}</Text>
                  </View>
                  <Text style={styles.meta}>{tt.origin}: {lot.origin}</Text>
                  <Text style={styles.meta}>
                    {tt.harvestDate}: {lot.harvestDate}
                    {" · "}{tt.batch}: {lot.batch}
                  </Text>
                  <Text style={[
                    styles.statusPill,
                    active ? styles.statusActive : styles.statusInactive,
                  ]}>
                    {active
                      ? es ? "Activo" : "Active"
                      : es ? "Inactivo" : "Inactive"}
                  </Text>

                  <View style={styles.pillsRow}>
                    <Text style={[styles.badgeTextBase, { color: badgeColor }]}>
                      {label}
                    </Text>
                    {canClearProof && proofs[lot.id] ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busyId !== null}
                        onPressIn={stopEvt}
                        onPress={(event) => {
                          stopEvt(event);
                          onClearProof(lot);
                        }}
                        style={styles.clearVerifiedBtn}
                      >
                        <Text style={styles.clearVerifiedText}>
                          {es ? "Quitar prueba local" : "Clear local proof"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.rowBottom}>
                    <Text style={styles.openHint}>{tt.openDetailsHint}</Text>
                    {canUpdate ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busyId !== null}
                        onPressIn={stopEvt}
                        onPress={(event) => {
                          stopEvt(event);
                          onChangeStatus(lot);
                        }}
                        style={[
                          styles.deleteBtn,
                          busyId !== null ? { opacity: 0.5 } : null,
                        ]}
                      >
                        <Text style={styles.deleteBtnText}>
                          {busyId === lot.id
                            ? es ? "Guardando..." : "Saving..."
                            : active
                              ? es ? "Desactivar" : "Deactivate"
                              : es ? "Activar" : "Activate"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  container: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  page: {
    flex: 1,
    backgroundColor: colors.light.background,
    padding: layout.screenPadding,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: spacing.lg,
  },
  headerRight: {
    flex: 1,
    minWidth: 180,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.brand.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 2,
  },
  title: {
    color: colors.light.text,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.extraBold,
  },
  sub: {
    color: colors.light.textSecondary,
    fontSize: typography.size.md,
    lineHeight: 25,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  countPill: {
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  backBtnText: {
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  createBtn: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary,
  },
  createBtnText: {
    color: colors.light.surface,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    minWidth: 90,
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  summaryValue: {
    color: colors.brand.primary,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extraBold,
  },
  summaryLabel: {
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  thumbWrap: {
    width: 88,
    height: 88,
    overflow: "hidden",
    borderRadius: radius.md,
    backgroundColor: colors.light.surfaceSecondary,
  },
  thumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbPlaceholderText: {
    color: colors.light.textSecondary,
    fontWeight: typography.weight.semibold,
  },
  cardBody: {
    flex: 1,
    minWidth: 170,
    gap: spacing.sm,
  },
  rowTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  product: {
    flexGrow: 1,
    flexShrink: 1,
    color: colors.light.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  idBadge: {
    flexShrink: 1,
    color: colors.light.textSecondary,
    fontSize: typography.size.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.light.surfaceSecondary,
  },
  meta: {
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
    lineHeight: 22,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    overflow: "hidden",
  },
  statusActive: {
    color: colors.brand.primaryDark,
    backgroundColor: colors.brand.primaryLight,
  },
  statusInactive: {
    color: colors.light.textSecondary,
    backgroundColor: colors.light.surfaceSecondary,
  },
  badgeTextBase: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  clearVerifiedBtn: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  clearVerifiedText: {
    color: colors.light.textSecondary,
    fontSize: typography.size.xs,
  },
  rowBottom: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  openHint: {
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  deleteBtn: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
  },
  deleteBtnText: {
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
