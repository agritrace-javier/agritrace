import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getPublicLot,
} from "../../../../src/features/lots/publicLotsService";
import type {
  PublicLot,
} from "../../../../src/features/lots/publicLotsService";
import {
  colors,
  layout,
  radius,
  spacing,
  typography,
} from "../../../../src/theme/tokens";

export default function PublicLotScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id =
    typeof params.id === "string" ? params.id.trim().toUpperCase() : "";

  const [lang, setLang] = useState<"en" | "es">("en");
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{
    id: string;
    lot: PublicLot | null;
  } | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const es = lang === "es";

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setErrorId(null);

    if (!id) return;

    void getPublicLot(id)
      .then((lot) => {
        if (!cancelled) setResult({ id, lot });
      })
      .catch(() => {
        if (!cancelled) setErrorId(id);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  const currentResult = result?.id === id ? result : null;
  const failed = !!id && errorId === id;
  const loading = !!id && !currentResult && !failed;
  const lot = currentResult?.lot;
  const product = lot
    ? (es ? lot.product_es || lot.product_en : lot.product_en || lot.product_es)
    : "";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>AgriTrace</Text>
          <View style={styles.languageRow}>
            {(["en", "es"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: lang === value }}
                onPress={() => setLang(value)}
                style={[
                  styles.languageButton,
                  lang === value ? styles.languageSelected : null,
                ]}
              >
                <Text style={styles.buttonText}>{value.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.eyebrow}>
          {es ? "TRAZABILIDAD DEL PRODUCTO" : "PRODUCT TRACEABILITY"}
        </Text>
        <Text style={styles.title}>
          {es ? "Origen del producto" : "Product origin"}
        </Text>
        <Text style={styles.body}>
          {es
            ? "Información publicada por el responsable del lote."
            : "Information published by the lot manager."}
        </Text>

        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator color={colors.brand.primary} />
            <Text style={styles.body}>
              {es ? "Cargando lote..." : "Loading lot..."}
            </Text>
          </View>
        ) : failed ? (
          <View style={styles.card}>
            <Text accessibilityRole="alert" style={styles.error}>
              {es
                ? "No se pudo cargar la información. Inténtalo de nuevo."
                : "Could not load the information. Please try again."}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setReload((value) => value + 1)}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {es ? "Reintentar" : "Retry"}
              </Text>
            </Pressable>
          </View>
        ) : !lot ? (
          <View style={styles.card}>
            <Text style={styles.heading}>
              {es ? "Lote no disponible" : "Lot unavailable"}
            </Text>
            <Text style={styles.body}>
              {es
                ? "Este enlace no tiene un lote activo publicado."
                : "This link has no published active lot."}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.heading}>{product}</Text>
              <Text selectable style={styles.lotId}>{lot.id}</Text>

              {[
                { label: es ? "Origen" : "Origin", value: lot.origin },
                {
                  label: es ? "Fecha de cosecha" : "Harvest date",
                  value: lot.harvest_date,
                },
                { label: "Batch", value: lot.batch },
              ].map((field) => (
                <View key={field.label} style={styles.field}>
                  <Text style={styles.label}>{field.label}</Text>
                  <Text selectable style={styles.value}>{field.value}</Text>
                </View>
              ))}
            </View>

            {lot.photos.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.heading}>
                  {es ? "Fotos del producto" : "Product photos"}
                </Text>
                <View style={styles.photos}>
                  {lot.photos.map((uri, index) => (
                    <Image
                      key={`${index}:${uri}`}
                      source={{ uri }}
                      accessibilityLabel={
                        es ? `Foto del producto ${index + 1}` : `Product photo ${index + 1}`
                      }
                      style={styles.photo}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <Text style={styles.footer}>
              {es
                ? "Los datos son proporcionados por el responsable del lote. Esta página no constituye una certificación independiente."
                : "Data is provided by the lot manager. This page does not constitute independent certification."}
            </Text>
          </>
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
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  brand: {
    color: colors.brand.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extraBold,
  },
  languageRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  languageButton: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  languageSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primaryLight,
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
  body: {
    color: colors.light.textSecondary,
    fontSize: typography.size.md,
    lineHeight: 25,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    color: colors.light.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  lotId: {
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  value: {
    color: colors.light.text,
    fontSize: typography.size.md,
    lineHeight: 25,
  },
  button: {
    minHeight: 48,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  buttonText: {
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  error: {
    color: colors.light.error,
    fontSize: typography.size.md,
  },
  photos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  photo: {
    width: "100%",
    maxWidth: 480,
    aspectRatio: 1.5,
    borderRadius: radius.md,
    backgroundColor: colors.light.surfaceSecondary,
    resizeMode: "cover",
  },
  footer: {
    color: colors.light.textSecondary,
    fontSize: typography.size.xs,
    lineHeight: 20,
  },
});
