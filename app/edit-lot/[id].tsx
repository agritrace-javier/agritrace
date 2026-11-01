import * as ImagePicker from "expo-image-picker";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../src/features/auth";
import { t as I18N } from "../i18n";
import { useLots } from "../lots-store";
import { colors, spacing, radius, typography, layout } from "../../src/theme/tokens";

function normalizeId(id: string | string[] | undefined) {
  if (!id) return "";
  return Array.isArray(id) ? id[0] : id;
}

function safeExtFromUri(uri: string) {
  const clean = uri.split("?")[0].split("#")[0];
  const m = clean.match(/\.([a-zA-Z0-9]+)$/);
  const ext = (m?.[1] || "jpg").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext)) return ext;
  return "jpg";
}

function mimeFromExt(ext: string) {
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
      return "image/jpeg";
    case "jpg":
    default:
      return "image/jpeg";
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  // @ts-ignore
  return globalThis.btoa(binary);
}

/**
 * MVP persistence rule:
 * - WEB: store as data URL base64 (blob: URIs die on refresh)
 * - NATIVE: store the URI as-is (file:// or content://)
 */
async function persistPickedAsset(
  asset: ImagePicker.ImagePickerAsset
): Promise<string | null> {
  const uri = asset?.uri;
  if (!uri) return null;

  // ✅ WEB: convert to base64 data URL
  if (Platform.OS === "web") {
    try {
      const ext = safeExtFromUri(uri);
      const mime = (asset as any)?.mimeType || mimeFromExt(ext);

      const res = await fetch(uri);
      const buf = await res.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);

      return `data:${mime};base64,${b64}`;
    } catch {
      // fallback: may not survive refresh, but prevents total failure
      return uri;
    }
  }

  // ✅ Native: keep URI
  return uri;
}

function isValidDateYYYYMMDD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function s(v: any) {
  return String(v ?? "").trim();
}

export default function EditLotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const lotId = normalizeId(params.id).trim().toUpperCase();

  const {
    user,
    organization,
    isLoading,
    isAuthenticated,
    hasActiveMembership,
    can,
  } = useAuth();
  const {
    getLotById,
    updateLot,
    isLoadingLots,
    lotsError,
    refreshLots,
    lang,
  } = useLots();

  const tt = I18N[lang];
  const es = lang === "es";
  const c = {
    red: colors.light.error,
  };

  const allowed = hasActiveMembership && can("lots.update");
  const found = getLotById(lotId);
  const lot =
    found?.organization_id === organization?.id ? found : undefined;

  const scope =
    user && organization && allowed
      ? `${user.id}:${organization.id}:${lotId}`
      : null;

  const [productEn, setProductEn] = useState("");
  const [productEs, setProductEs] = useState("");
  const [origin, setOrigin] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [batch, setBatch] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [initializedScope, setInitializedScope] = useState<string | null>(null);

  const initializedRef = useRef<string | null>(null);
  const operationRef = useRef(false);
  const aliveRef = useRef(false);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!scope || !lot || initializedRef.current === scope) return;
    initializedRef.current = scope;
    setProductEn(lot.product_en);
    setProductEs(lot.product_es);
    setOrigin(lot.origin);
    setHarvestDate(lot.harvestDate);
    setBatch(lot.batch);
    setNotes(lot.notes ?? "");
    setPhotoUris(lot.photos ?? []);
    setFormError(null);
    setInitializedScope(scope);
  }, [scope, lot]);

  const onCancel = () => {
    if (operationRef.current) return;
    if (lotId) {
      router.replace({ pathname: "/lot/[id]", params: { id: lotId } });
    } else {
      router.replace("/catalog");
    }
  };

  const pickPhotos = async () => {
    if (operationRef.current || !scope || photoUris.length >= 12) return;
    const requestScope = scope;
    operationRef.current = true;
    setBusy(true);
    setFormError(null);

    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== "granted") {
          throw new Error(
            es ? "Activa el permiso de fotos." : "Enable photo access."
          );
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 12 - photoUris.length,
      });
      if (result.canceled) return;

      const photos = (
        await Promise.all(result.assets.map(persistPickedAsset))
      ).filter((uri): uri is string => !!uri);

      if (aliveRef.current && scopeRef.current === requestScope) {
        setPhotoUris((previous) =>
          Array.from(new Set([...previous, ...photos])).slice(0, 12)
        );
      }
    } catch (error) {
      if (aliveRef.current && scopeRef.current === requestScope) {
        setFormError(
          error instanceof Error
            ? error.message
            : es ? "No se pudieron seleccionar fotos." : "Could not select photos."
        );
      }
    } finally {
      operationRef.current = false;
      if (aliveRef.current) setBusy(false);
    }
  };

  const onSave = async () => {
    if (
      operationRef.current ||
      !scope ||
      !lot ||
      initializedScope !== scope ||
      !allowed
    ) {
      return;
    }

    const pe = productEn.trim();
    const ps = productEs.trim();
    const o = origin.trim();
    const h = harvestDate.trim();
    const b = batch.trim();

    if ((!pe && !ps) || !o || !h || !b) {
      setFormError(tt.fillRequired);
      return;
    }

    const date = new Date(`${h}T00:00:00.000Z`);
    if (
      !isValidDateYYYYMMDD(h) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== h ||
      h.startsWith("0000-")
    ) {
      setFormError(tt.dateFormatHint);
      return;
    }

    const requestScope = scope;
    operationRef.current = true;
    setBusy(true);
    setFormError(null);

    try {
      const result = await updateLot(lot.id, {
        product_en: pe || ps,
        product_es: ps || pe,
        origin: o,
        harvestDate: h,
        batch: b,
        notes: notes.trim() || undefined,
        photos: photoUris,
      });

      if (!aliveRef.current || scopeRef.current !== requestScope) return;
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      if (Platform.OS === "web") {
        const browser = globalThis as unknown as {
          alert?: (message: string) => void;
        };
        browser.alert?.(
          `${es ? "Cambios guardados" : "Changes saved"}: ${result.lot.id}`
        );
      } else {
        Alert.alert(
          es ? "Cambios guardados" : "Changes saved",
          result.lot.id
        );
      }
      router.replace({
        pathname: "/lot/[id]",
        params: { id: result.lot.id },
      });
    } catch {
      if (aliveRef.current && scopeRef.current === requestScope) {
        setFormError(
          es ? "No se pudieron guardar los cambios." : "Could not save changes."
        );
      }
    } finally {
      operationRef.current = false;
      if (aliveRef.current) setBusy(false);
    }
  };

  if (isLoading) {
    return <View style={styles.page}><ActivityIndicator /></View>;
  }
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!hasActiveMembership || !organization) {
    return <Redirect href="/organization-setup" />;
  }

  const title = es ? "Editar lote" : "Edit lot";
  const unavailable =
    !allowed
      ? es ? "No tienes permiso para editar lotes." : "You cannot edit lots."
      : lotsError
        ? lotsError
        : !lot
          ? es ? "El lote no está disponible." : "This lot is unavailable."
          : null;

  if (isLoadingLots || unavailable || initializedScope !== scope) {
    return (
      <View style={styles.page}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/catalog")}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>{tt.back}</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        {isLoadingLots && allowed ? (
          <ActivityIndicator />
        ) : unavailable ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {unavailable}
          </Text>
        ) : (
          <ActivityIndicator />
        )}
        {lotsError && allowed ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void refreshLots()}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>{es ? "Reintentar" : "Retry"}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const fields = [
    { label: "Producto / Product (EN)", value: productEn, change: setProductEn },
    { label: "Producto / Product (ES)", value: productEs, change: setProductEs },
    { label: tt.origin, value: origin, change: setOrigin },
    { label: tt.harvestDate, value: harvestDate, change: setHarvestDate },
    { label: tt.batch, value: batch, change: setBatch },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onCancel}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>{es ? "Cancelar" : "Cancel"}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>
          {es ? "GESTIÓN DE LOTES" : "LOT MANAGEMENT"}
        </Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>
          {es
            ? "Actualiza los datos y las fotos del lote."
            : "Update the lot details and photos."}
        </Text>
        <Text style={styles.sub}>{lotId}</Text>
        <Text style={styles.sub}>
          {es ? "Cosecha de origen" : "Source harvest"}: {lot?.harvest_id}
        </Text>

        {fields.map((field, index) => (
          <View key={index}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              value={field.value}
              onChangeText={field.change}
              editable={!busy}
              style={styles.input}
            />
          </View>
        ))}

        <Text style={styles.hint}>YYYY-MM-DD</Text>
        <Text style={styles.label}>{tt.notesOptional}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          editable={!busy}
          multiline
          style={[styles.input, styles.notes]}
        />

        <View style={styles.photosBox}>
          <Text style={styles.photosTitle}>
            {es ? "Fotos" : "Photos"} ({photoUris.length}/12)
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickPhotos()}
            disabled={busy || photoUris.length >= 12}
            style={[styles.photoBtn, busy ? styles.disabled : null]}
          >
            <Text style={styles.photoBtnText}>
              {es ? "Agregar fotos" : "Add photos"}
            </Text>
          </Pressable>

          <View style={styles.photosRow}>
            {photoUris.map((uri, index) => (
              <View key={`${uri}:${index}`} style={styles.photoCard}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => setPhotoUris((previous) =>
                    previous.filter((item) => item !== uri))}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeBtnText}>
                    {es ? "Quitar" : "Remove"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {formError ? (
          <Text accessibilityRole="alert" style={[styles.errorText, { color: c.red }]}>
            {formError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => void onSave()}
          disabled={busy}
          style={[styles.saveBtn, busy ? styles.disabled : null]}
        >
          <Text style={styles.saveBtnText}>
            {busy
              ? es ? "Procesando..." : "Processing..."
              : es ? "Guardar cambios" : "Save changes"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  headerRow: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    flexDirection: "row",
  },
  content: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    color: colors.brand.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.light.text,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.extraBold,
  },
  description: {
    color: colors.light.textSecondary,
    fontSize: typography.size.md,
    lineHeight: 25,
    marginTop: spacing.sm,
  },
  sub: {
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
    lineHeight: 23,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.light.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.surface,
    color: colors.light.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.size.md,
    marginBottom: spacing.sm,
  },
  notes: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  backBtn: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    backgroundColor: colors.light.surface,
  },
  backBtnText: {
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  photosBox: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  photosTitle: {
    color: colors.light.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  photoBtn: {
    minHeight: 48,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primaryLight,
  },
  photoBtnText: {
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  photosRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  photoCard: {
    width: 140,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  photoThumb: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  removeBtn: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.surfaceSecondary,
  },
  removeBtnText: {
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  saveBtn: {
    minHeight: 52,
    marginTop: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.md,
  },
  saveBtnText: {
    color: colors.light.surface,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  disabled: {
    opacity: 0.5,
  },
  hint: {
    color: colors.light.textSecondary,
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.light.error,
    fontSize: typography.size.sm,
    lineHeight: 23,
    marginTop: spacing.md,
  },
});
