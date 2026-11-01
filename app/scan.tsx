import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  colors,
  layout,
  radius,
  spacing,
  typography,
} from "../src/theme/tokens";
import { useLots } from "./lots-store";

function validLotId(value: string): string | null {
  const id = value.trim().toUpperCase();
  return /^LOT-[A-Z0-9-]{1,123}$/.test(id) ? id : null;
}

function extractLotId(value: string): string | null {
  const raw = value.trim();
  const direct = validLotId(raw);
  if (direct) return direct;

  try {
    const url = new URL(raw);
    if (!["http:", "https:", "exp:", "exps:", "agritrace:"].includes(url.protocol)) {
      return null;
    }

    const path =
      url.protocol === "agritrace:"
        ? `/${url.hostname}${url.pathname}`
        : url.pathname;

    const match = path.match(
      /^\/(?:--\/)?(?:public\/)?lot\/([^/]+)\/?$/i
    );

    return match ? validLotId(decodeURIComponent(match[1])) : null;
  } catch {
    return null;
  }
}

export default function ScanScreen() {
  const router = useRouter();
  const { lang, setLang } = useLots();
  const es = lang === "es";
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const openingRef = useRef(false);
  const lastInvalidScanRef = useRef(0);

  const openLot = (raw: string, fromCamera: boolean) => {
    if (openingRef.current) return;
    const id = extractLotId(raw);

    if (!id) {
      if (fromCamera) {
        const now = Date.now();
        if (now - lastInvalidScanRef.current < 1500) return;
        lastInvalidScanRef.current = now;
      }
      setError(
        es
          ? "Usa un ID de lote o un enlace válido de AgriTrace."
          : "Use a lot ID or a valid AgriTrace lot link."
      );
      return;
    }

    openingRef.current = true;
    setScanned(true);
    setError(null);

    try {
      router.replace({
        pathname: "/public/lot/[id]",
        params: { id },
      });
    } catch {
      openingRef.current = false;
      setScanned(false);
      setError(
        es ? "No se pudo abrir el lote." : "Could not open the lot."
      );
    }
  };

  const allowCamera = async () => {
    if (requestingPermission) return;
    setRequestingPermission(true);
    setError(null);
    try {
      await requestPermission();
    } catch {
      setError(
        es
          ? "No se pudo solicitar acceso a la cámara."
          : "Could not request camera access."
      );
    } finally {
      setRequestingPermission(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/")}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{es ? "Volver" : "Back"}</Text>
          </Pressable>

          <View style={styles.languageRow}>
            {(["en", "es"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: lang === value }}
                onPress={() => setLang(value)}
                style={[
                  styles.button,
                  lang === value ? styles.selected : null,
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
        <Text style={styles.title}>{es ? "Escanear QR" : "Scan QR"}</Text>
        <Text style={styles.body}>
          {es
            ? "Consulta la información pública de un lote sin iniciar sesión."
            : "View a lot's public information without signing in."}
        </Text>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        ) : null}

        {Platform.OS !== "web" ? (
          <View style={styles.card}>
            <Text style={styles.heading}>{es ? "Cámara" : "Camera"}</Text>

            {!permission ? (
              <ActivityIndicator color={colors.brand.primary} />
            ) : !permission.granted ? (
              <>
                <Text style={styles.body}>
                  {permission.canAskAgain
                    ? es
                      ? "Permite el acceso a la cámara para escanear."
                      : "Allow camera access to scan."
                    : es
                      ? "Activa el permiso de cámara en los ajustes del dispositivo o utiliza la entrada manual."
                      : "Enable camera permission in device settings or use manual entry."}
                </Text>
                {permission.canAskAgain ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void allowCamera()}
                    disabled={requestingPermission}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryText}>
                      {es ? "Permitir cámara" : "Allow camera"}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : scanned ? (
              <Text style={styles.body}>
                {es ? "Abriendo lote..." : "Opening lot..."}
              </Text>
            ) : (
              <>
                <View style={styles.cameraFrame}>
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={({ data }) => openLot(data, true)}
                    onMountError={() =>
                      setError(
                        es
                          ? "No se pudo abrir la cámara. Puedes introducir el lote manualmente."
                          : "Could not open the camera. You can enter the lot manually."
                      )
                    }
                  />
                </View>
                <Text style={styles.body}>
                  {es ? "Apunta la cámara al QR del lote." : "Point the camera at the lot QR."}
                </Text>
              </>
            )}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.heading}>
            {es ? "Abrir por enlace o ID" : "Open by link or ID"}
          </Text>
          <Text style={styles.body}>
            {es
              ? "Pega el enlace del QR o escribe el identificador del lote."
              : "Paste the QR link or enter the lot identifier."}
          </Text>
          <TextInput
            accessibilityLabel={es ? "Enlace o ID del lote" : "Lot link or ID"}
            value={manual}
            onChangeText={(value) => {
              setManual(value);
              setError(null);
            }}
            placeholder="LOT-0001"
            placeholderTextColor={colors.light.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => openLot(manual, false)}
            style={styles.input}
            editable={!scanned}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => openLot(manual, false)}
            disabled={scanned || !manual.trim()}
            style={[
              styles.primaryButton,
              scanned || !manual.trim() ? styles.disabled : null,
            ]}
          >
            <Text style={styles.primaryText}>
              {es ? "Abrir lote" : "Open lot"}
            </Text>
          </Pressable>
          <Text style={styles.note}>
            {es
              ? "Solo se muestran lotes publicados y activos."
              : "Only published active lots are shown."}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.light.background },
  content: { flexGrow: 1, paddingBottom: spacing.xxl },
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
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  languageRow: { flexDirection: "row", gap: spacing.sm },
  button: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    backgroundColor: colors.light.surface,
  },
  buttonText: {
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  selected: {
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
  heading: {
    color: colors.light.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
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
  input: {
    minHeight: 52,
    color: colors.light.text,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.size.md,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary,
  },
  primaryText: {
    color: colors.light.surface,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  error: {
    color: colors.light.error,
    fontSize: typography.size.md,
    lineHeight: 25,
  },
  note: {
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
    lineHeight: 22,
  },
  cameraFrame: {
    height: 320,
    width: "100%",
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.dark.background,
  },
  camera: { flex: 1 },
  disabled: { opacity: 0.5 },
});
