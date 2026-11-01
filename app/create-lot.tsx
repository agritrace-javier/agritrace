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
import { useAuth } from "../src/features/auth";
import {
  getActiveHarvestsByOrganization,
  getHarvestById,
} from "../src/features/harvests/harvestsService";
import type { Harvest } from "../src/features/harvests/harvestsService";
import { t as I18N } from "./i18n";
import { useLots } from "./lots-store";
import { colors, spacing, radius, typography, layout } from "../src/theme/tokens";

async function webUriToDataUrl(uri: string): Promise<string> {
  if (uri.startsWith("data:")) return uri;
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Could not read the selected photo.");
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not process the photo."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(blob);
  });
}

function messageOf(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Could not complete the operation.";
}

export default function CreateLotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ harvestId?: string | string[] }>();
  const requestedHarvestId =
    typeof params.harvestId === "string" ? params.harvestId : null;

  const {
    user,
    organization,
    isLoading,
    isAuthenticated,
    hasActiveMembership,
    can,
  } = useAuth();
  const { saveLot, lang } = useLots();
  const tt = I18N[lang];
  const es = lang === "es";
  const c = {
    muted: colors.light.textSecondary,
    red: colors.light.error,
    green: colors.brand.primary,
  };

  const allowed = hasActiveMembership && can("lots.create");
  const organizationId = organization?.id;
  const scope =
    user && organizationId && allowed
      ? `${user.id}:${organizationId}`
      : null;

  const [harvestData, setHarvestData] = useState<{
    scope: string;
    items: Harvest[];
  } | null>(null);
  const [loadError, setLoadError] = useState<{
    scope: string;
    message: string;
  } | null>(null);
  const [reload, setReload] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [productEn, setProductEn] = useState("");
  const [productEs, setProductEs] = useState("");
  const [origin, setOrigin] = useState("");
  const [batch, setBatch] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [busyPhotos, setBusyPhotos] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const aliveRef = useRef(false);
  const scopeRef = useRef(scope);
  const operationRef = useRef(false);
  const pendingLotIdRef = useRef<string | null>(null);
  scopeRef.current = scope;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!scope || !organizationId) return;
    const requestScope = scope;
    const requestOrganizationId = organizationId;
    let cancelled = false;

    setHarvestData(null);
    setLoadError(null);
    setSelectedId("");

    void getActiveHarvestsByOrganization(requestOrganizationId)
      .then((items) => {
        if (cancelled) return;
        setHarvestData({ scope: requestScope, items });
        if (requestedHarvestId) {
          const match = items.find((item) => item.id === requestedHarvestId);
          if (match) setSelectedId(match.id);
        } else if (items.length === 1) {
          setSelectedId(items[0].id);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError({ scope: requestScope, message: messageOf(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scope, organizationId, requestedHarvestId, reload]);

  const currentData = harvestData?.scope === scope ? harvestData : null;
  const currentError = loadError?.scope === scope ? loadError.message : null;
  const selected = currentData?.items.find((item) => item.id === selectedId);

  const pickPhotos = async () => {
    if (operationRef.current || !scope || photoUris.length >= 5) return;
    const requestScope = scope;
    operationRef.current = true;
    setBusyPhotos(true);
    setFormError(null);

    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== "granted") {
          throw new Error(
            es ? "Activa el permiso de acceso a fotos." : "Enable photo access."
          );
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 5 - photoUris.length,
      });
      if (result.canceled) return;

      const picked = result.assets.map((asset) => asset.uri).filter(Boolean);
      const photos =
        Platform.OS === "web"
          ? await Promise.all(picked.map(webUriToDataUrl))
          : picked;

      if (aliveRef.current && scopeRef.current === requestScope) {
        setPhotoUris((previous) =>
          Array.from(new Set([...previous, ...photos])).slice(0, 5)
        );
      }
    } catch (error) {
      if (aliveRef.current && scopeRef.current === requestScope) {
        setFormError(messageOf(error));
      }
    } finally {
      operationRef.current = false;
      if (aliveRef.current) setBusyPhotos(false);
    }
  };

  const onSave = async () => {
    if (
      operationRef.current ||
      !scope ||
      !organizationId ||
      !allowed ||
      !selected
    ) {
      return;
    }

    const pe = productEn.trim();
    const ps = productEs.trim();
    const o = origin.trim();
    const b = batch.trim();
    if ((!pe && !ps) || !o || !b) {
      setFormError(
        es
          ? "Completa producto, origen y batch."
          : "Complete product, origin and batch."
      );
      return;
    }

    const requestScope = scope;
    operationRef.current = true;
    setBusySave(true);
    setFormError(null);

    try {
      const harvest = await getHarvestById(organizationId, selected.id);
      if (
        !harvest ||
        !harvest.is_active ||
        harvest.organization_id !== organizationId
      ) {
        throw new Error(
          es
            ? "La cosecha ya no está disponible. Recarga la lista."
            : "The harvest is no longer available. Reload the list."
        );
      }
      if (!aliveRef.current || scopeRef.current !== requestScope) return;

      const id =
        pendingLotIdRef.current ??
        `LOT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
          .toUpperCase();
      pendingLotIdRef.current = id;

      const result = await saveLot({
        id,
        organization_id: organizationId,
        harvest_id: harvest.id,
        product_en: pe || ps,
        product_es: ps || pe,
        origin: o,
        harvestDate: harvest.harvest_date,
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
          `${es ? "Lote creado" : "Lot created"}: ${result.lot.id}`
        );
      } else {
        Alert.alert(es ? "Lote creado" : "Lot created", result.lot.id);
      }
      router.replace("/catalog");
    } catch (error) {
      if (aliveRef.current && scopeRef.current === requestScope) {
        setFormError(messageOf(error));
      }
    } finally {
      operationRef.current = false;
      if (aliveRef.current) setBusySave(false);
    }
  };

  if (isLoading) {
    return <View style={styles.page}><ActivityIndicator /></View>;
  }
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!hasActiveMembership || !organization) {
    return <Redirect href="/organization-setup" />;
  }
  if (!allowed) {
    return (
      <View style={styles.page}>
        <Text style={styles.sub}>
          {es ? "No tienes permiso para crear lotes." : "You cannot create lots."}
        </Text>
        <Pressable onPress={() => router.replace("/catalog")} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{tt.back}</Text>
        </Pressable>
      </View>
    );
  }

  const busy = busyPhotos || busySave;

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
          onPress={() => router.replace("/catalog")}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>{tt.back}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>
          {es ? "GESTIÓN DE LOTES" : "LOT MANAGEMENT"}
        </Text>
        <Text style={styles.title}>{es ? "Crear lote" : "Create lot"}</Text>
        <Text style={styles.description}>
          {es
            ? "Registra un lote y vincúlalo a su cosecha de origen."
            : "Register a lot and link it to its source harvest."}
        </Text>
        <Text style={styles.sub}>{organization.name}</Text>
        <Text style={styles.label}>
          {es ? "Cosecha de origen" : "Source harvest"}
        </Text>

        {currentError ? (
          <View>
            <Text accessibilityRole="alert" style={[styles.sub, { color: c.red }]}>
              {currentError}
            </Text>
            <Pressable onPress={() => setReload((value) => value + 1)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>{es ? "Reintentar" : "Retry"}</Text>
            </Pressable>
          </View>
        ) : !currentData ? (
          <ActivityIndicator />
        ) : currentData.items.length === 0 ? (
          <Text style={styles.sub}>
            {es
              ? "Primero registra una cosecha activa para esta organización."
              : "Register an active harvest for this organization first."}
          </Text>
        ) : (
          currentData.items.map((harvest) => (
            <Pressable
              key={harvest.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedId === harvest.id }}
              disabled={busy}
              onPress={() => setSelectedId(harvest.id)}
              style={[
                styles.input,
                selectedId === harvest.id ? { borderColor: c.green, borderWidth: 2 } : null,
              ]}
            >
              <Text style={styles.backBtnText}>{harvest.name}</Text>
              <Text style={styles.sub}>
                {harvest.harvest_date} · {harvest.quantity} {harvest.unit}
                {"\n"}ID: {harvest.id}
              </Text>
            </Pressable>
          ))
        )}

        {selected ? (
          <Text style={styles.sub}>
            {tt.harvestDate}: {selected.harvest_date}
          </Text>
        ) : null}

        <Text style={styles.label}>Producto / Product (EN)</Text>
        <TextInput
          value={productEn} onChangeText={setProductEn}
          editable={!busy} style={styles.input}
          placeholder="Coffee Beans" placeholderTextColor={c.muted}
        />
        <Text style={styles.label}>Producto / Product (ES)</Text>
        <TextInput
          value={productEs} onChangeText={setProductEs}
          editable={!busy} style={styles.input}
          placeholder="Granos de café" placeholderTextColor={c.muted}
        />
        <Text style={styles.label}>{tt.origin}</Text>
        <TextInput
          value={origin} onChangeText={setOrigin}
          editable={!busy} style={styles.input}
          placeholder="Santa Ana, El Salvador" placeholderTextColor={c.muted}
        />
        <Text style={styles.label}>{tt.batch}</Text>
        <TextInput
          value={batch} onChangeText={setBatch}
          editable={!busy} style={styles.input}
          autoCapitalize="none" placeholder="BATCH-A1"
          placeholderTextColor={c.muted}
        />
        <Text style={styles.label}>{tt.notesOptional}</Text>
        <TextInput
          value={notes} onChangeText={setNotes}
          editable={!busy} multiline
          style={[styles.input, styles.notes]}
        />

        <View style={styles.photosBox}>
          <Text style={styles.photosTitle}>
            {es ? "Fotos del producto" : "Product photos"} ({photoUris.length}/5)
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickPhotos()}
            disabled={busy || photoUris.length >= 5}
            style={[styles.photoBtn, busy ? styles.disabled : null]}
          >
            <Text style={styles.photoBtnText}>
              {busyPhotos
                ? es ? "Procesando..." : "Processing..."
                : es ? "Subir fotos" : "Upload photos"}
            </Text>
          </Pressable>
          <View style={styles.photosRow}>
            {photoUris.map((uri) => (
              <View key={uri} style={styles.photoCard}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => setPhotoUris((previous) =>
                    previous.filter((item) => item !== uri))}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeBtnText}>{es ? "Quitar" : "Remove"}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {formError ? (
          <Text accessibilityRole="alert" style={[styles.sub, { color: c.red }]}>
            {formError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => void onSave()}
          disabled={busy || !selected}
          style={[
            styles.saveBtn,
            busy || !selected ? styles.disabled : null,
          ]}
        >
          <Text style={styles.saveBtnText}>
            {busySave ? es ? "Guardando..." : "Saving..." : tt.saveLot}
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
});
