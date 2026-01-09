// app/scan.tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import type { Lang } from "./i18n";
import { t as I18N } from "./i18n";
import { useLots } from "./lots-store";
import { getTheme } from "./theme";

type TT = (typeof I18N)[Lang];

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function cleanLotId(raw: string) {
  const id = safeDecode(String(raw || "").trim());
  return id.toUpperCase();
}

function extractLotIdFromScanned(data: string): string | null {
  if (!data) return null;

  const s = String(data).trim();

  // ✅ If QR is EXACTLY the lot id
  if (/^LOT-[A-Z0-9-]+$/i.test(s)) return cleanLotId(s);

  // ✅ Common URL forms:
  // - https://xxxx.ngrok-free.dev/lot/LOT-0001
  // - https://xxxx.ngrok-free.dev/--/lot/LOT-0001
  // - agritrace://lot/LOT-0001
  // - agritrace://--/lot/LOT-0001
  const lower = s.toLowerCase();

  // Look for "/--/lot/" first (Expo Router tunnel format)
  const idxTunnel = lower.lastIndexOf("/--/lot/");
  if (idxTunnel >= 0) {
    const tail = s.slice(idxTunnel + "/--/lot/".length);
    const clean = tail.split(/[?#/]/)[0];
    if (clean) return cleanLotId(clean);
  }

  // Then standard "/lot/"
  const idx = lower.lastIndexOf("/lot/");
  if (idx >= 0) {
    const tail = s.slice(idx + "/lot/".length);
    const clean = tail.split(/[?#/]/)[0];
    if (clean) return cleanLotId(clean);
  }

  // ✅ Sometimes: "lot:LOT-0001" or "lot=LOT-0001"
  const m2 = s.match(/lot[:=]\s*(LOT-[A-Z0-9-]+)/i);
  if (m2?.[1]) return cleanLotId(m2[1]);

  // ✅ Find "LOT-XXXX" anywhere (last resort)
  const m1 = s.match(/(LOT-[A-Z0-9-]+)/i);
  if (m1?.[1]) return cleanLotId(m1[1]);

  return null;
}

export default function ScanScreen() {
  const router = useRouter();
  const { lang, themeName } = useLots();
  const tt: TT = I18N[lang];

  const theme = useMemo(() => getTheme(themeName), [themeName]);
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(c), [c]);

  // Local strings (bilingual) — no depende de i18n.ts
  const s = useMemo(() => {
    if (lang === "es") {
      return {
        title: "Escanear QR",
        webNote:
          "En web, la cámara puede fallar. Pega un link del lote o el LOT-ID:",
        webPlaceholder: "https://.../lot/LOT-0001  o  LOT-0001",
        open: "Abrir",
        allowCamera: "Permitir cámara",
        needPermission: "Se necesita permiso de cámara para escanear QR.",
        pointCamera: "Apunta la cámara al QR",
        scannedOk: "Escaneado ✓",
        scanAgain: "Escanear otra vez",
        notRecognized:
          "QR no reconocido. Debe contener un LOT-ID o /lot/LOT-XXXX (o /--/lot/LOT-XXXX).",
        pasteValid: "Pega un link válido o un LOT-ID (ej: LOT-0001).",
        invalidLot: "Lote inválido",
        missingLot: "No se pudo extraer el LOT-ID del QR.",
      };
    }
    return {
      title: "QR Scan",
      webNote:
        "On web, camera scanning can be inconsistent. Paste a lot link or LOT-ID:",
      webPlaceholder: "https://.../lot/LOT-0001  or  LOT-0001",
      open: "Open",
      allowCamera: "Allow Camera",
      needPermission: "Camera permission is required to scan QR codes.",
      pointCamera: "Point the camera at a QR",
      scannedOk: "Scanned ✓",
      scanAgain: "Scan again",
      notRecognized:
        "QR not recognized. It must contain a LOT-ID or /lot/LOT-XXXX (or /--/lot/LOT-XXXX).",
      pasteValid: "Paste a valid lot link or LOT-ID (e.g. LOT-0001).",
      invalidLot: "Invalid lot",
      missingLot: "Could not extract LOT-ID from QR.",
    };
  }, [lang]);

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Web fallback (paste)
  const [manual, setManual] = useState("");

  // ✅ cooldown to prevent repeated scans/alerts firing
  const cooldownRef = useRef(false);
  const cooldown = (ms: number) => {
    cooldownRef.current = true;
    setTimeout(() => {
      cooldownRef.current = false;
    }, ms);
  };

  useEffect(() => {
    setScanned(false);
    cooldownRef.current = false;
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!permission) return;

    // ✅ Ask permission once if not granted
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const goBack = () => {
    setScanned(false);
    router.replace("/catalog");
  };

  const goToLot = (maybeId: string | null) => {
    if (!maybeId) {
      Alert.alert(s.invalidLot, s.missingLot);
      return;
    }

    // ✅ hard validate again
    const clean = maybeId.toUpperCase().trim();
    if (!/^LOT-[A-Z0-9-]+$/.test(clean)) {
      Alert.alert(s.invalidLot, s.missingLot);
      return;
    }

    setScanned(true);
    router.replace({ pathname: "/lot/[id]", params: { id: clean } } as any);
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    if (cooldownRef.current) return;

    const id = extractLotIdFromScanned(data);
    if (!id) {
      cooldown(900);
      Alert.alert("QR", s.notRecognized);
      return;
    }

    // ✅ prevent double-trigger while routing
    cooldown(1200);
    goToLot(id);
  };

  const onOpenManual = () => {
    const id = extractLotIdFromScanned(manual);
    if (!id) {
      Alert.alert("QR", s.pasteValid);
      return;
    }
    goToLot(id);
  };

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backBtnText}>← {tt.back}</Text>
        </Pressable>

        <Text style={styles.title}>{s.title}</Text>
      </View>

      {Platform.OS === "web" ? (
        <View style={styles.webBox}>
          <Text style={styles.webText}>{s.webNote}</Text>

          <TextInput
            value={manual}
            onChangeText={setManual}
            placeholder={s.webPlaceholder}
            placeholderTextColor={c.muted}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Pressable
            onPress={onOpenManual}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>{s.open}</Text>
          </Pressable>
        </View>
      ) : !permission?.granted ? (
        <View style={styles.webBox}>
          <Text style={styles.webText}>{s.needPermission}</Text>
          <Pressable
            onPress={requestPermission}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>{s.allowCamera}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={onBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />

          <View style={styles.scanHint}>
            <Text style={styles.scanHintText}>{s.pointCamera}</Text>
            {scanned ? (
              <Text style={styles.scanHintTextMuted}>{s.scannedOk}</Text>
            ) : null}
          </View>

          {scanned ? (
            <Pressable
              onPress={() => {
                setScanned(false);
                cooldownRef.current = false;
              }}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryBtnText}>{s.scanAgain}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
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
      marginBottom: 12,
      gap: 10,
    },
    title: { color: c.text, fontSize: 18, fontWeight: "900", letterSpacing: 0.6 },

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

    webBox: {
      marginTop: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      padding: 14,
      gap: 10,
    },
    webText: { color: c.text, fontWeight: "800", letterSpacing: 0.2 },

    input: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      color: c.text,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 0.2,
    },

    primaryBtn: {
      backgroundColor: c.green,
      borderColor: c.green,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 999,
      alignItems: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    primaryBtnText: { color: "white", fontWeight: "900", letterSpacing: 0.6 },

    secondaryBtn: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 999,
      alignItems: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    secondaryBtnText: { color: c.text, fontWeight: "900", letterSpacing: 0.6 },

    cameraWrap: {
      flex: 1,
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    camera: { flex: 1 },

    scanHint: {
      padding: 12,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    scanHintText: { color: c.text, fontWeight: "900", letterSpacing: 0.2 },
    scanHintTextMuted: { color: c.muted, fontWeight: "900", letterSpacing: 0.2 },
  });
