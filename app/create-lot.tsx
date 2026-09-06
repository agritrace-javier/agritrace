// app/create-lot.tsx
import type { Session } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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
import { t as I18N } from "./i18n";
import { useLots } from "./lots-store";
import { supabase } from "./supabase";
import { getTheme } from "./theme";

function isValidDateYYYYMMDD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeText(v: string) {
  return String(v ?? "").trim();
}

function makeLotId() {
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LOT-${code}`;
}

/**
 * ✅ WEB ONLY:
 * Convert a blob/object URL (or normal URL) to data URL so it persists after refresh.
 */
async function webUriToDataUrl(uri: string): Promise<string> {
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

export default function CreateLotScreen() {
  const router = useRouter();

  const { saveLot, getLotById, lang, themeName } = useLots();
  const tt = I18N[lang];

  const theme = useMemo(() => getTheme(themeName), [themeName]);
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  // ✅ ALL hooks must be declared BEFORE any conditional return
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [productEn, setProductEn] = useState("");
  const [productEs, setProductEs] = useState("");
  const [origin, setOrigin] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [batch, setBatch] = useState("");
  const [notes, setNotes] = useState("");

  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [busyPhotos, setBusyPhotos] = useState(false);
  const [busySave, setBusySave] = useState(false);

  const isAuthed = !!session?.user?.id;

  const ui = useMemo(() => {
    if (lang === "es") {
      return {
        photosTitle: "Fotos del producto",
        photosSub: "Sube fotos del producto para que el cliente vea evidencia del lote.",
        upload: "Subir fotos",
        remove: "Quitar",
        max5: "Máximo 5 fotos (demo).",
        permDenied: "Permiso denegado. Activa acceso a Fotos en Settings y vuelve a intentar.",
        pickFailed: "No se pudieron seleccionar fotos.",
        needLoginTitle: "Necesitas iniciar sesión",
        needLoginBody: "Inicia sesión para crear y guardar lotes.",
        ok: "OK",
        productEnLabel: "Producto (EN)",
        productEsLabel: "Producto (ES)",
        productHintEn: "ej. Papaya",
        productHintEs: "ej. Papaya",
        originHint: "ej. Santa Ana, El Salvador",
        batchHint: "ej. BATCH-A1",
        dateHint: "YYYY-MM-DD",
        converting: "Procesando fotos…",
        loadingSession: "Cargando sesión…",
        saving: "Guardando…",
        savedTitle: "Guardado",
        savedBody: "Lote creado:",
        saveErrTitle: "No se pudo guardar",
      };
    }
    return {
      photosTitle: "Product photos",
      photosSub: "Upload photos so clients can see evidence for this lot/batch.",
      upload: "Upload photos",
      remove: "Remove",
      max5: "Max 5 photos (demo).",
      permDenied: "Permission denied. Enable Photos access in Settings and try again.",
      pickFailed: "Could not pick photos.",
      needLoginTitle: "Login required",
      needLoginBody: "Please log in to create and save lots.",
      ok: "OK",
      productEnLabel: "Product (EN)",
      productEsLabel: "Product (ES)",
      productHintEn: "e.g. Papaya",
      productHintEs: "e.g. Papaya",
      originHint: "e.g. Santa Ana, El Salvador",
      batchHint: "e.g. BATCH-A1",
      dateHint: "YYYY-MM-DD",
      converting: "Processing photos…",
      loadingSession: "Loading session…",
      saving: "Saving…",
      savedTitle: "Saved",
      savedBody: "Lot created:",
      saveErrTitle: "Could not save",
    };
  }, [lang]);

  // ✅ Load session once + keep in sync
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);
      } finally {
        if (mounted) setAuthReady(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ✅ Redirect only after we know auth state
  useEffect(() => {
    if (!authReady) return;
    if (!isAuthed) {
      if (Platform.OS !== "web") {
        Alert.alert("AgriTrace", ui.needLoginBody, [{ text: ui.ok }]);
      }
      router.replace("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, isAuthed, router]);

  const handleBack = () => {
    router.replace("/catalog");
  };

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

      const picked = (res.assets ?? [])
        .map((a) => a?.uri)
        .filter((u): u is string => !!u);

      if (picked.length === 0) return;

      // ✅ WEB: convert picked uris to data URLs so they survive refresh
      if (Platform.OS === "web") {
        setBusyPhotos(true);
        try {
          const converted: string[] = [];
          for (const uri of picked) {
            const dataUrl = await webUriToDataUrl(uri);
            if (dataUrl) converted.push(dataUrl);
          }

          setPhotoUris((prev) => {
            const next = [...prev, ...converted];
            return next.slice(0, 5);
          });
        } finally {
          setBusyPhotos(false);
        }
        return;
      }

      // ✅ Native: keep file uri
      setPhotoUris((prev) => {
        const next = [...prev, ...picked];
        return next.slice(0, 5);
      });
    } catch {
      setBusyPhotos(false);
      Alert.alert("AgriTrace", ui.pickFailed);
    }
  };

  const onRemovePhoto = (uri: string) => {
    setPhotoUris((prev) => prev.filter((x) => x !== uri));
  };

  const buildUniqueLotId = () => {
    for (let i = 0; i < 30; i++) {
      const id = makeLotId();
      if (!getLotById(id)) return id;
    }
    return `LOT-${Date.now().toString(36).toUpperCase()}`;
  };

  const onSave = async () => {
    if (busyPhotos || busySave) return;

    if (!isAuthed) {
      Alert.alert("AgriTrace", ui.needLoginBody, [{ text: ui.ok }]);
      router.replace("/login");
      return;
    }

    const pe = normalizeText(productEn);
    const ps = normalizeText(productEs);
    const o = normalizeText(origin);
    const h = normalizeText(harvestDate);
    const b = normalizeText(batch);
    const n = normalizeText(notes);

    if (!o || !h || !b || (!pe && !ps)) {
      Alert.alert(tt.missingFields, tt.fillRequired);
      return;
    }

    if (!isValidDateYYYYMMDD(h)) {
      Alert.alert(tt.invalidDate, tt.dateFormatHint);
      return;
    }

    const finalEn = pe || ps;
    const finalEs = ps || pe;

    const id = buildUniqueLotId();

    setBusySave(true);
    try {
      const result = await saveLot({
        id,
        product_en: finalEn,
        product_es: finalEs,
        origin: o,
        harvestDate: h,
        batch: b,
        notes: n || undefined,
        photos: photoUris.slice(0, 5),
        createdAt: Date.now(),
      } as any);

      if (!result.ok) {
        Alert.alert(ui.saveErrTitle, result.error);
        return;
      }

      // ✅ Only show saved if Supabase confirmed
      if (Platform.OS === "web") {
        // @ts-ignore
        globalThis?.alert?.(`${ui.savedTitle}: ${result.lot.id}`);
      } else {
        Alert.alert(ui.savedTitle, `${ui.savedBody} ${result.lot.id}`);
      }

      router.replace("/catalog");
    } finally {
      setBusySave(false);
    }
  };

  // ✅ Render states (no early return before hooks)
  if (!authReady) {
    return (
      <View style={[styles.page, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: c.muted, fontWeight: "800" }}>{ui.loadingSession}</Text>
      </View>
    );
  }

  if (!isAuthed) {
    // redirect is handled by effect; keep screen blank to avoid flicker
    return <View style={styles.page} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backBtnText}>← {tt.back}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{tt.createLotTitle}</Text>
        <Text style={styles.sub}>{tt.createLotSub}</Text>

        <Text style={styles.label}>{ui.productEnLabel}</Text>
        <TextInput
          value={productEn}
          onChangeText={setProductEn}
          placeholder={ui.productHintEn}
          placeholderTextColor={c.muted}
          style={styles.input}
        />

        <Text style={styles.label}>{ui.productEsLabel}</Text>
        <TextInput
          value={productEs}
          onChangeText={setProductEs}
          placeholder={ui.productHintEs}
          placeholderTextColor={c.muted}
          style={styles.input}
        />

        <Text style={styles.label}>{tt.origin}</Text>
        <TextInput
          value={origin}
          onChangeText={setOrigin}
          placeholder={ui.originHint}
          placeholderTextColor={c.muted}
          style={styles.input}
        />

        <Text style={styles.label}>{tt.harvestDate}</Text>
        <TextInput
          value={harvestDate}
          onChangeText={setHarvestDate}
          placeholder={ui.dateHint}
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>{tt.batch}</Text>
        <TextInput
          value={batch}
          onChangeText={setBatch}
          placeholder={ui.batchHint}
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>{tt.notesOptional}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={lang === "es" ? "Opcional" : "Optional"}
          placeholderTextColor={c.muted}
          style={[styles.input, styles.notes]}
          multiline
        />

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
                (photoUris.length >= 5 || busyPhotos || busySave) && styles.disabled,
              ]}
              disabled={photoUris.length >= 5 || busyPhotos || busySave}
            >
              <Text style={styles.photoBtnText}>
                {busyPhotos ? ui.converting : ui.upload}
              </Text>
            </Pressable>

            <Text style={styles.photosCount}>{photoUris.length}/5</Text>
          </View>

          {photoUris.length > 0 ? (
            <View style={styles.photosRow}>
              {photoUris.map((uri) => (
                <View key={uri} style={styles.photoCard}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <Pressable
                    onPress={() => onRemovePhoto(uri)}
                    style={({ pressed }) => [
                      styles.removeBtn,
                      pressed && styles.pressed,
                      busySave && styles.disabled,
                    ]}
                    disabled={busySave}
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
          style={({ pressed }) => [
            styles.saveBtn,
            pressed && styles.pressed,
            (busyPhotos || busySave) && styles.disabled,
          ]}
          disabled={busyPhotos || busySave}
        >
          <Text style={styles.saveBtnText}>
            {busySave ? ui.saving : tt.saveLot}
          </Text>
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
  });
