// app/edit-lot/[id].tsx
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
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
import { t as I18N } from "../i18n";
import type { Lot } from "../lots";
import { useLots } from "../lots-store";
import { getTheme } from "../theme";

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
  const lotId = normalizeId(params.id);

  const { getLotById, updateLot, lang, mode, themeName } = useLots();
  const tt = I18N[lang];

  const theme = useMemo(() => getTheme(themeName), [themeName]);
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  const lot = (lotId ? (getLotById(lotId) as Lot | undefined) : undefined) as
    | Lot
    | undefined;

  // ✅ Gate: operator only
  useEffect(() => {
    if (mode !== "operator") {
      if (Platform.OS !== "web") Alert.alert(tt.wrongPin, tt.tryAgain);
      router.replace("/catalog");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, router]);

  // Avoid flash if client
  if (mode !== "operator") {
    return <View style={styles.page} />;
  }

  const ui = useMemo(() => {
    if (lang === "es") {
      return {
        title: "Editar lote",
        sub: "Actualiza datos del lote y agrega fotos si faltaban.",
        notFound: "No se encontró el lote:",
        save: "Guardar cambios",
        cancel: "Cancelar",
        productEn: "Producto (EN)",
        productEs: "Producto (ES)",
        origin: "Origen",
        harvestDate: "Fecha de cosecha",
        batch: "Batch",
        notes: "Notas (opcional)",
        dateHint: "Formato: YYYY-MM-DD",
        missingFields: "Faltan campos",
        fillRequired:
          "Completa los campos requeridos: Producto (EN o ES), Origen, Fecha y Batch.",
        invalidDate: "Fecha inválida",
        invalidDateBody: "Usa el formato YYYY-MM-DD (ej. 2026-01-10).",

        photosTitle: "Fotos del producto",
        photosSub:
          "Sube fotos del producto para que el cliente vea evidencia del lote.",
        upload: "Subir fotos",
        remove: "Quitar",
        max5: "Máximo 5 fotos (demo).",
        permDenied:
          "Permiso denegado. Activa acceso a Fotos en Settings y vuelve a intentar.",
        pickFailed: "No se pudieron seleccionar fotos.",
        saved: "Guardado",
        savedBody: "Cambios guardados para:",
      };
    }
    return {
      title: "Edit lot",
      sub: "Update lot details and add photos if needed.",
      notFound: "Lot not found:",
      save: "Save changes",
      cancel: "Cancel",
      productEn: "Product (EN)",
      productEs: "Product (ES)",
      origin: "Origin",
      harvestDate: "Harvest date",
      batch: "Batch",
      notes: "Notes (optional)",
      dateHint: "Format: YYYY-MM-DD",
      missingFields: "Missing fields",
      fillRequired:
        "Please fill required fields: Product (EN or ES), Origin, Date and Batch.",
      invalidDate: "Invalid date",
      invalidDateBody: "Use YYYY-MM-DD (e.g. 2026-01-10).",

      photosTitle: "Product photos",
      photosSub: "Upload photos so clients can see evidence for this lot/batch.",
      upload: "Upload photos",
      remove: "Remove",
      max5: "Max 5 photos (demo).",
      permDenied:
        "Permission denied. Enable Photos access in Settings and try again.",
      pickFailed: "Could not pick photos.",
      saved: "Saved",
      savedBody: "Changes saved for:",
    };
  }, [lang, tt.tryAgain, tt.wrongPin]);

  // ✅ init form from lot
  const [productEn, setProductEn] = useState("");
  const [productEs, setProductEs] = useState("");
  const [origin, setOrigin] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [batch, setBatch] = useState("");
  const [notes, setNotes] = useState("");

  const [photoUris, setPhotoUris] = useState<string[]>([]);

  useEffect(() => {
    if (!lot) return;

    setProductEn(s((lot as any).product_en));
    setProductEs(s((lot as any).product_es));
    setOrigin(s(lot.origin));
    setHarvestDate(s(lot.harvestDate));
    setBatch(s(lot.batch));
    setNotes(s((lot as any).notes));

    const existingPhotos = Array.isArray((lot as any).photos) ? (lot as any).photos : [];
    setPhotoUris(
      existingPhotos
        .map((u: any) => s(u))
        .filter(Boolean)
        .slice(0, 5)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lot?.id]);

  const requestPhotoPermissionIfNeeded = async () => {
    if (Platform.OS === "web") return true;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("AgriTrace", ui.permDenied);
      return false;
    }
    return true;
  };

  const onPickPhotos = async () => {
    try {
      const ok = await requestPhotoPermissionIfNeeded();
      if (!ok) return;

      const remaining = Math.max(0, 5 - photoUris.length);
      if (remaining <= 0) return;

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
        allowsMultipleSelection: true as any,
        selectionLimit: remaining as any,
      });

      if (res.canceled) return;

      const assets = (res.assets ?? []).filter(Boolean);
      if (assets.length === 0) return;

      const persisted = (
        await Promise.all(assets.map((a) => persistPickedAsset(a)))
      ).filter((u): u is string => !!u);

      if (persisted.length === 0) return;

      setPhotoUris((prev) => {
        const next = [...prev, ...persisted];
        const uniq = Array.from(new Set(next));
        return uniq.slice(0, 5);
      });
    } catch {
      Alert.alert("AgriTrace", ui.pickFailed);
    }
  };

  const onRemovePhoto = (uri: string) => {
    setPhotoUris((prev) => prev.filter((x) => x !== uri));
  };

  const onCancel = () => {
    if (!lotId) {
      router.replace("/catalog");
      return;
    }
    router.replace({ pathname: "/lot/[id]", params: { id: lotId } } as any);
  };

  const onSave = () => {
    if (!lotId || !lot) {
      router.replace("/catalog");
      return;
    }

    const pe = s(productEn);
    const ps = s(productEs);
    const o = s(origin);
    const h = s(harvestDate);
    const b = s(batch);
    const n = s(notes);

    if (!o || !h || !b || (!pe && !ps)) {
      Alert.alert(ui.missingFields, ui.fillRequired);
      return;
    }

    if (!isValidDateYYYYMMDD(h)) {
      Alert.alert(ui.invalidDate, ui.invalidDateBody);
      return;
    }

    // ✅ If only one product is filled, mirror to the other
    const finalEn = pe || ps;
    const finalEs = ps || pe;

    updateLot(lotId, {
      product_en: finalEn,
      product_es: finalEs,
      origin: o,
      harvestDate: h,
      batch: b,
      notes: n || undefined,
      photos: photoUris,
    });

    if (Platform.OS === "web") {
      // @ts-ignore
      globalThis?.alert?.(`${ui.saved}: ${lotId}`);
    } else {
      Alert.alert(ui.saved, `${ui.savedBody} ${lotId}`);
    }

    router.replace({ pathname: "/lot/[id]", params: { id: lotId } } as any);
  };

  // If lot missing
  if (!lotId || !lot) {
    return (
      <View style={styles.page}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace("/catalog")}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backBtnText}>← {tt.back}</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{ui.title}</Text>
        <Text style={styles.errorText}>
          {ui.notFound} {lotId || "(no id)"}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <View style={styles.headerRow}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backBtnText}>← {ui.cancel}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <Text style={styles.title}>{ui.title}</Text>
        <Text style={styles.sub}>{ui.sub}</Text>

        {/* Product EN */}
        <Text style={styles.label}>{ui.productEn}</Text>
        <TextInput
          value={productEn}
          onChangeText={setProductEn}
          placeholder={lang === "es" ? "ej. Papaya" : "e.g. Papaya"}
          placeholderTextColor={c.muted}
          style={styles.input}
        />

        {/* Product ES */}
        <Text style={styles.label}>{ui.productEs}</Text>
        <TextInput
          value={productEs}
          onChangeText={setProductEs}
          placeholder={lang === "es" ? "ej. Papaya" : "e.g. Papaya"}
          placeholderTextColor={c.muted}
          style={styles.input}
        />

        <Text style={styles.label}>{ui.origin}</Text>
        <TextInput
          value={origin}
          onChangeText={setOrigin}
          placeholder={lang === "es" ? "ej. Santa Ana, El Salvador" : "e.g. Santa Ana, El Salvador"}
          placeholderTextColor={c.muted}
          style={styles.input}
        />

        <Text style={styles.label}>{ui.harvestDate}</Text>
        <TextInput
          value={harvestDate}
          onChangeText={setHarvestDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          style={styles.input}
        />
        <Text style={styles.hint}>{ui.dateHint}</Text>

        <Text style={styles.label}>{ui.batch}</Text>
        <TextInput
          value={batch}
          onChangeText={setBatch}
          placeholder={lang === "es" ? "ej. BATCH-A1" : "e.g. BATCH-A1"}
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>{ui.notes}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={lang === "es" ? "Opcional" : "Optional"}
          placeholderTextColor={c.muted}
          style={[styles.input, styles.notes]}
          multiline
        />

        {/* Photos */}
        <View style={styles.photosBox}>
          <Text style={styles.photosTitle}>{ui.photosTitle}</Text>
          <Text style={styles.photosSub}>
            {ui.photosSub} {ui.max5}
          </Text>

          <View style={styles.photosActions}>
            <Pressable
              onPress={onPickPhotos}
              style={({ pressed }) => [
                styles.photoBtn,
                pressed && styles.pressed,
                photoUris.length >= 5 && styles.disabled,
              ]}
              disabled={photoUris.length >= 5}
            >
              <Text style={styles.photoBtnText}>{ui.upload}</Text>
            </Pressable>

            <Text style={styles.photosCount}>{photoUris.length}/5</Text>
          </View>

          {photoUris.length > 0 ? (
            <View style={styles.photosRow}>
              {photoUris.map((uri, idx) => (
                <View key={`${uri}-${idx}`} style={styles.photoCard}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <Pressable
                    onPress={() => onRemovePhoto(uri)}
                    style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.removeBtnText}>{ui.remove}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={onSave}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
        >
          <Text style={styles.saveBtnText}>{ui.save}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type ThemeColors = ReturnType<typeof getTheme>["colors"];
const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg, padding: 20 },

    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
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
    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    disabled: { opacity: 0.55 },

    content: { paddingBottom: 40 },

    title: {
      color: c.text,
      fontSize: 34,
      fontWeight: "900",
      letterSpacing: 1,
      marginTop: 2,
    },
    sub: {
      color: c.muted,
      marginTop: 6,
      marginBottom: 12,
      fontSize: 13,
      letterSpacing: 0.3,
      lineHeight: 18,
    },

    label: {
      marginTop: 10,
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 12,
    },
    input: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      color: c.text,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
      fontSize: 14,
      letterSpacing: 0.3,
    },
    notes: { minHeight: 90, textAlignVertical: "top" },
    hint: {
      marginTop: 6,
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.2,
      fontSize: 12,
    },

    photosBox: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 12,
    },
    photosTitle: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 13,
    },
    photosSub: {
      marginTop: 6,
      color: c.muted,
      fontWeight: "700",
      letterSpacing: 0.2,
      lineHeight: 18,
    },
    photosActions: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
    },
    photoBtn: {
      backgroundColor: c.segmentBg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 999,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    photoBtnText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      fontSize: 12,
    },
    photosCount: {
      color: c.muted,
      fontWeight: "900",
      letterSpacing: 0.2,
      fontSize: 12,
    },
    photosRow: {
      marginTop: 12,
      flexDirection: "row",
      gap: 10,
      flexWrap: "wrap",
    },
    photoCard: {
      width: 140,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
    },
    photoThumb: { width: "100%", height: 120, resizeMode: "cover" },
    removeBtn: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.card,
      alignItems: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    removeBtnText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.3,
      fontSize: 12,
    },

    saveBtn: {
      marginTop: 16,
      backgroundColor: c.green,
      borderColor: c.green,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      alignItems: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    saveBtnText: {
      color: "white",
      fontWeight: "900",
      letterSpacing: 0.6,
      fontSize: 14,
    },

    errorText: {
      marginTop: 10,
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });
