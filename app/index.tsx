// app/index.tsx
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLots } from "./lots-store";
import { getTheme, ThemeName } from "./theme";

const LOGO_MARK = require("../assets/logo-mark.png");

export default function HomeScreen() {
  const router = useRouter();

  // ✅ TODO global desde store
  const { lang, setLang, themeName, setThemeName, mode, enterOperatorWithPin, exitToClient } = useLots();

  const theme = useMemo(() => getTheme(themeName), [themeName]);
  const styles = useMemo(() => makeStyles(theme.colors), [theme.colors]);

  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");

  const t = useMemo(() => {
    const dict = {
      en: {
        title: "AgriTrace",
        subtitle: "Connects the farm, logistics, and consumer using blockchain traceability.",
        language: "Language",
        theme: "Theme",
        light: "Light",
        dark: "Dark",
        start: "Start",
        about: "About Us",
        modeLabel: "Mode",
        client: "Client",
        operator: "Operator",
        enterOperator: "Enter Operator",
        exit: "Exit",
        pinTitle: "Enter Operator PIN",
        pinPlaceholder: "••••",
        cancel: "Cancel",
        confirm: "Confirm",
        wrongPin: "Wrong PIN",
        tryAgain: "Try again.",
        tipWeb: "Responsive layout — resize the browser window.",
        tipMobile: "Optimized for mobile and web.",
      },
      es: {
        title: "AgriTrace",
        subtitle: "Conecta el productor, la logística y el consumidor usando trazabilidad en blockchain.",
        language: "Idioma",
        theme: "Tema",
        light: "Claro",
        dark: "Oscuro",
        start: "Comenzar",
        about: "Acerca de nosotros",
        modeLabel: "Modo",
        client: "Cliente",
        operator: "Operador",
        enterOperator: "Entrar Operador",
        exit: "Salir",
        pinTitle: "PIN de Operador",
        pinPlaceholder: "••••",
        cancel: "Cancelar",
        confirm: "Confirmar",
        wrongPin: "PIN incorrecto",
        tryAgain: "Intenta otra vez.",
        tipWeb: "Diseño responsive — cambia el tamaño del navegador.",
        tipMobile: "Optimizado para móvil y web.",
      },
    } as const;

    return dict[lang];
  }, [lang]);

  const openPin = () => {
    setPin("");
    setShowPin(true);
  };

  const confirmPin = () => {
    if (pin.length !== 4) {
      Alert.alert(t.wrongPin, t.tryAgain);
      return;
    }
    const ok = enterOperatorWithPin(pin);
    if (!ok) {
      Alert.alert(t.wrongPin, t.tryAgain);
      return;
    }
    setShowPin(false);
  };

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO */}
        <View style={styles.hero}>
          <Image source={LOGO_MARK} style={styles.heroLogo} resizeMode="contain" />

          <Text style={styles.heroTitle}>{t.title}</Text>
          <Text style={styles.heroSubtitle}>{t.subtitle}</Text>

          {/* Mode badge + action */}
          <View style={styles.modeRow}>
            <Text style={styles.modeBadge}>
              {t.modeLabel}: {mode === "operator" ? t.operator : t.client}
            </Text>

            {mode === "operator" ? (
              <Pressable
                style={({ pressed }) => [styles.modeBtn, pressed && styles.primaryBtnPressed]}
                onPress={exitToClient}
              >
                <Text style={styles.modeBtnText}>{t.exit}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.modeBtn, pressed && styles.primaryBtnPressed]}
                onPress={openPin}
              >
                <Text style={styles.modeBtnText}>{t.enterOperator}</Text>
              </Pressable>
            )}
          </View>

          {/* START */}
          <Pressable
            style={({ pressed }) => [styles.heroPrimaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={() => router.push("/catalog")}
          >
            <Text style={styles.heroPrimaryBtnText}>{t.start}</Text>
            <Text style={styles.heroPrimaryBtnArrow}>→</Text>
          </Pressable>

          {/* ABOUT US */}
          <Pressable
            style={({ pressed }) => [styles.heroSecondaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={() => router.push("/about")}
          >
            <Text style={styles.heroSecondaryBtnText}>{t.about}</Text>
            <Text style={styles.heroSecondaryBtnArrow}>→</Text>
          </Pressable>

          <Text style={styles.footerHint}>{Platform.OS === "web" ? t.tipWeb : t.tipMobile}</Text>
        </View>

        {/* CONTROLS */}
        <View style={styles.controlsCard}>
          <View style={styles.section}>
            <Text style={styles.label}>{t.language}</Text>
            <Segmented
              value={lang}
              leftValue="en"
              rightValue="es"
              leftLabel="EN"
              rightLabel="ES"
              onChange={(v) => setLang(v as "en" | "es")}
              styles={styles}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.theme}</Text>
            <Segmented
              value={themeName}
              leftValue="light"
              rightValue="dark"
              leftLabel={t.light}
              rightLabel={t.dark}
              onChange={(v) => setThemeName(v as ThemeName)}
              styles={styles}
            />
          </View>
        </View>

        {/* PIN BOX */}
        {showPin ? (
          <View style={styles.pinBox}>
            <Text style={styles.pinTitle}>{t.pinTitle}</Text>
            <TextInput
              value={pin}
              onChangeText={(txt) => setPin(txt.replace(/[^0-9]/g, ""))}
              maxLength={4}
              keyboardType="numeric"
              secureTextEntry
              placeholder={t.pinPlaceholder}
              placeholderTextColor={theme.colors.muted}
              style={styles.pinInput}
            />
            <View style={styles.pinButtonsRow}>
              <Pressable
                style={({ pressed }) => [styles.pinCancelBtn, pressed && styles.primaryBtnPressed]}
                onPress={() => setShowPin(false)}
              >
                <Text style={styles.pinCancelText}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.pinConfirmBtn, pressed && styles.primaryBtnPressed]}
                onPress={confirmPin}
              >
                <Text style={styles.pinConfirmText}>{t.confirm}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Segmented(props: {
  value: string;
  leftValue: string;
  rightValue: string;
  leftLabel: string;
  rightLabel: string;
  onChange: (v: string) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const isLeft = props.value === props.leftValue;

  return (
    <View style={props.styles.segmentWrap}>
      <Pressable
        onPress={() => props.onChange(props.leftValue)}
        style={[props.styles.segment, isLeft && props.styles.segmentActive]}
      >
        <Text style={[props.styles.segmentText, isLeft && props.styles.segmentTextActive]}>{props.leftLabel}</Text>
      </Pressable>

      <Pressable
        onPress={() => props.onChange(props.rightValue)}
        style={[props.styles.segment, !isLeft && props.styles.segmentActive]}
      >
        <Text style={[props.styles.segmentText, !isLeft && props.styles.segmentTextActive]}>{props.rightLabel}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof getTheme>["colors"]) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg },

    scroll: { flex: 1 },
    scrollContent: {
      padding: 20,
      paddingBottom: 34,
      alignItems: "center",
      justifyContent: "flex-start",
    },

    hero: { width: "100%", maxWidth: 860, alignItems: "center", paddingBottom: 14 },
    heroLogo: { width: 190, height: 190, marginBottom: 6 },
    heroTitle: { fontSize: 44, fontWeight: "900", color: c.text, letterSpacing: 1.2, marginTop: 6 },
    heroSubtitle: {
      marginTop: 10,
      maxWidth: 700,
      textAlign: "center",
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0.4,
      color: c.muted,
      paddingHorizontal: 10,
    },

    modeRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
    modeBadge: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.4,
      backgroundColor: c.segmentBg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      fontSize: 12,
    },
    modeBtn: {
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: c.border,
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    modeBtnText: { color: c.text, fontWeight: "900", letterSpacing: 0.6, fontSize: 12 },

    heroPrimaryBtn: {
      marginTop: 16,
      backgroundColor: c.green,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: 28,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: c.green,
      minWidth: 220,
      alignSelf: "center",
    },
    heroPrimaryBtnText: { color: "white", fontSize: 16, fontWeight: "900", letterSpacing: 1, textAlign: "center" },
    heroPrimaryBtnArrow: { color: "white", fontSize: 18, fontWeight: "900" },

    heroSecondaryBtn: {
      marginTop: 10,
      backgroundColor: c.card,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: 28,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: c.border,
      minWidth: 220,
      alignSelf: "center",
    },
    heroSecondaryBtnText: { color: c.text, fontSize: 16, fontWeight: "900", letterSpacing: 1, textAlign: "center" },
    heroSecondaryBtnArrow: { color: c.text, fontSize: 18, fontWeight: "900" },

    primaryBtnPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

    footerHint: { marginTop: 10, fontSize: 12, letterSpacing: 0.4, color: c.muted, textAlign: "center" },

    controlsCard: {
      width: "100%",
      maxWidth: 460,
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
      marginTop: 12,
    },

    section: { marginTop: 10 },
    label: { fontSize: 11, fontWeight: "900", color: c.muted, textTransform: "uppercase", letterSpacing: 1.6, marginBottom: 8 },

    segmentWrap: { flexDirection: "row", backgroundColor: c.segmentBg, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 3, gap: 6 },
    segment: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
    segmentActive: { backgroundColor: c.green },
    segmentText: { fontWeight: "900", color: c.text, fontSize: 12, letterSpacing: 0.8, textAlign: "center" },
    segmentTextActive: { color: "white", letterSpacing: 0.8, textAlign: "center" },

    pinBox: {
      marginTop: 12,
      width: "100%",
      maxWidth: 420,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 18,
      padding: 14,
    },
    pinTitle: { color: c.text, fontSize: 16, fontWeight: "900", letterSpacing: 0.6, marginBottom: 10 },
    pinInput: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.segmentBg,
      color: c.text,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 6,
      textAlign: "center",
    },
    pinButtonsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
    pinCancelBtn: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
    pinCancelText: { color: c.text, fontWeight: "900", letterSpacing: 0.6 },
    pinConfirmBtn: { backgroundColor: c.green, borderWidth: 1, borderColor: c.green, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
    pinConfirmText: { color: "white", fontWeight: "900", letterSpacing: 0.6 },
  });
