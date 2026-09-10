// app/index.tsx
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { supabase } from "./supabase";
import { getTheme, ThemeName } from "./theme";

const LOGO_MARK = require("../assets/logo-mark.png");

type ProfileMini = {
  first_name: string | null;
  last_name: string | null;
};

export default function HomeScreen() {
  const router = useRouter();

  const {
    lang,
    setLang,
    themeName,
    setThemeName,
    mode,
    enterOperatorWithPin,
    exitToClient,
  } = useLots();

  const theme = useMemo(() => getTheme(themeName), [themeName]);
  const styles = useMemo(() => makeStyles(theme.colors), [theme.colors]);

  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");

  // ✅ AUTH STATE (stable)
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // ✅ PROFILE DISPLAY (optional, non-blocking)
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  // Prevent double-setting logs & avoid state updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // ✅ Watchdog: if getSession hangs, don't freeze UI
    const watchdog = setTimeout(() => {
      if (!mountedRef.current) return;
      if (!authReady) {
        console.warn("[auth] getSession timeout -> forcing authReady=true");
        setAuthReady(true);
      }
    }, 2000);

    (async () => {
      try {
        console.log("[auth] getSession() start");
        const { data, error } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        if (error) {
          console.warn("[auth] getSession error:", error.message);
          setSession(null);
        } else {
          console.log("[auth] getSession OK:", !!data.session);
          setSession(data.session ?? null);
        }
      } catch (e: any) {
        if (!mountedRef.current) return;
        console.warn("[auth] getSession threw:", e?.message ?? String(e));
        setSession(null);
      } finally {
        if (!mountedRef.current) return;
        setAuthReady(true);
        clearTimeout(watchdog);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mountedRef.current) return;
      console.log("[auth] onAuthStateChange:", _event, "session?", !!s);
      setSession(s);
      setAuthReady(true);
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(watchdog);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAuthed = !!session?.user?.id;
  const userEmail = session?.user?.email ?? "";
  const userId = session?.user?.id ?? null;

  // ✅ Non-blocking profile fetch (only for display name)
  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async (uid: string) => {
      setProfileReady(false);

      const WATCHDOG_MS = 2000;

      try {
        const result = await Promise.race<
          { data: ProfileMini | null; error: any } | null
        >([
          supabase
            .from("profiles")
            .select("first_name,last_name")
            .eq("id", uid)
            .maybeSingle()
            .then((r) => ({ data: (r.data as any) ?? null, error: r.error })),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), WATCHDOG_MS)),
        ]);

        if (cancelled) return;

        if (!result) {
          // timeout: don't block UI
          setProfile(null);
          setProfileReady(true);
          return;
        }

        if (result.error) {
          console.warn("[profile] fetch error:", result.error.message ?? result.error);
          setProfile(null);
          setProfileReady(true);
          return;
        }

        setProfile(result.data ?? null);
        setProfileReady(true);
      } catch (e: any) {
        if (cancelled) return;
        console.warn("[profile] fetch threw:", e?.message ?? String(e));
        setProfile(null);
        setProfileReady(true);
      }
    };

    if (!authReady) return;

    if (!isAuthed || !userId) {
      setProfile(null);
      setProfileReady(true);
      return;
    }

    fetchProfile(userId);

    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthed, userId]);

  const displayName = useMemo(() => {
    const f = (profile?.first_name ?? "").trim();
    const l = (profile?.last_name ?? "").trim();
    const name = `${f} ${l}`.trim();
    return name || "";
  }, [profile]);

  const t = useMemo(() => {
    const dict = {
      en: {
        title: "AgriTrace",
        subtitle:
          "Connects the farm, logistics, and consumer using blockchain traceability.",
        language: "Language",
        theme: "Theme",
        light: "Light",
        dark: "Dark",
        start: "Open Catalog",
        scan: "Scan QR",
        scanHint: "Consumer flow (scan → lot details).",
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

        authTitle: "Account",
        login: "Log in",
        signup: "Sign up",
        authHint: "Create an account to save lots and manage your profile.",
        signedInAs: "Signed in as",
        logout: "Log out",
        logoutErr: "Logout error",
        loadingAuth: "Loading session…",

        createLot: "Create Lot",
        createLotHint: "Create and save your own lots (requires login).",
        profile: "Profile",
        needLoginTitle: "Login required",
        needLoginBody: "Please log in to continue.",
        retry: "Retry",

        homeName: "Welcome",
      },
      es: {
        title: "AgriTrace",
        subtitle:
          "Conecta el productor, la logística y el consumidor usando trazabilidad en blockchain.",
        language: "Idioma",
        theme: "Tema",
        light: "Claro",
        dark: "Oscuro",
        start: "Abrir Catálogo",
        scan: "Escanear QR",
        scanHint: "Flujo consumidor (scan → detalle del lote).",
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

        authTitle: "Cuenta",
        login: "Iniciar sesión",
        signup: "Crear cuenta",
        authHint: "Crea una cuenta para guardar lotes y administrar tu perfil.",
        signedInAs: "Sesión activa",
        logout: "Cerrar sesión",
        logoutErr: "Error al cerrar sesión",
        loadingAuth: "Cargando sesión…",

        createLot: "Crear Lote",
        createLotHint: "Crea y guarda tus propios lotes (requiere sesión).",
        profile: "Perfil",
        needLoginTitle: "Necesitas iniciar sesión",
        needLoginBody: "Por favor inicia sesión para continuar.",
        retry: "Reintentar",

        homeName: "Bienvenido",
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

  async function onLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err: any) {
      Alert.alert(t.logoutErr, err?.message ?? "Unknown error");
    }
  }

  function requireLoginThen(path: "/create-lot" | "/profile") {
    if (!authReady) {
      Alert.alert("AgriTrace", t.loadingAuth);
      return;
    }
    if (!isAuthed) {
      Alert.alert(t.needLoginTitle, t.needLoginBody);
      router.push("/login");
      return;
    }
    router.push(path);
  }

  // ✅ If auth is stuck even after watchdog, let user proceed
  const showLoading = !authReady;

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Image source={LOGO_MARK} style={styles.heroLogo} resizeMode="contain" />

          <Text style={styles.heroTitle}>{t.title}</Text>
          <Text style={styles.heroSubtitle}>{t.subtitle}</Text>

          <View style={styles.modeRow}>
            <Text style={styles.modeBadge}>
              {t.modeLabel}: {mode === "operator" ? t.operator : t.client}
            </Text>

            {mode === "operator" ? (
              <Pressable
                style={({ pressed }) => [
                  styles.modeBtn,
                  pressed && styles.primaryBtnPressed,
                ]}
                onPress={exitToClient}
              >
                <Text style={styles.modeBtnText}>{t.exit}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.modeBtn,
                  pressed && styles.primaryBtnPressed,
                ]}
                onPress={openPin}
              >
                <Text style={styles.modeBtnText}>{t.enterOperator}</Text>
              </Pressable>
            )}
          </View>

          {/* ACCOUNT CARD */}
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>{t.authTitle}</Text>

            {showLoading ? (
              <>
                <Text style={styles.authHint}>{t.loadingAuth}</Text>

                {/* emergency buttons so you are never stuck */}
                <View style={styles.authedQuickRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.authedSecondaryBtn,
                      pressed && styles.primaryBtnPressed,
                    ]}
                    onPress={() => {
                      setAuthReady(true);
                    }}
                  >
                    <Text style={styles.authedSecondaryBtnText}>{t.retry}</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.authedPrimaryBtn,
                      pressed && styles.primaryBtnPressed,
                    ]}
                    onPress={() => router.push("/login")}
                  >
                    <Text style={styles.authedPrimaryBtnText}>{t.login}</Text>
                  </Pressable>
                </View>
              </>
            ) : isAuthed ? (
              <>
                <Text style={styles.signedInText}>
                  {t.signedInAs}:{" "}
                  <Text style={styles.signedInEmail}>
                    {displayName
                      ? displayName
                      : userEmail || "(no email)"}
                  </Text>
                </Text>

                {/* tiny helper line (optional) */}
                <Text style={styles.authHint}>
                  {profileReady
                    ? displayName
                      ? ""
                      : userEmail
                        ? userEmail
                        : ""
                    : lang === "es"
                      ? "Cargando nombre…"
                      : "Loading name…"}
                </Text>

                <View style={styles.authedQuickRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.authedPrimaryBtn,
                      pressed && styles.primaryBtnPressed,
                    ]}
                    onPress={() => requireLoginThen("/create-lot")}
                  >
                    <Text style={styles.authedPrimaryBtnText}>{t.createLot}</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.authedSecondaryBtn,
                      pressed && styles.primaryBtnPressed,
                    ]}
                    onPress={() => requireLoginThen("/profile")}
                  >
                    <Text style={styles.authedSecondaryBtnText}>{t.profile}</Text>
                  </Pressable>
                </View>

                <Text style={styles.authHint}>{t.createLotHint}</Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.authDangerBtn,
                    pressed && styles.primaryBtnPressed,
                  ]}
                  onPress={onLogout}
                >
                  <Text style={styles.authDangerBtnText}>{t.logout}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.authButtonsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.authSecondaryBtn,
                      pressed && styles.primaryBtnPressed,
                    ]}
                    onPress={() => router.push("/login")}
                  >
                    <Text style={styles.authSecondaryBtnText}>{t.login}</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.authPrimaryBtn,
                      pressed && styles.primaryBtnPressed,
                    ]}
                    onPress={() => router.push("/signup")}
                  >
                    <Text style={styles.authPrimaryBtnText}>{t.signup}</Text>
                  </Pressable>
                </View>

                <Text style={styles.authHint}>{t.authHint}</Text>
              </>
            )}
          </View>

          {/* PRIMARY ACTIONS */}
          <View style={styles.heroActions}>
            <Pressable
              style={({ pressed }) => [
                styles.heroPrimaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
              onPress={() => router.push("/scan")}
            >
              <Text style={styles.heroPrimaryBtnText}>{t.scan}</Text>
              <Text style={styles.heroPrimaryBtnArrow}>→</Text>
            </Pressable>

            <Text style={styles.actionHint}>{t.scanHint}</Text>

            <Pressable
              style={({ pressed }) => [
                styles.heroSecondaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
              onPress={() => router.push("/catalog")}
            >
              <Text style={styles.heroSecondaryBtnText}>{t.start}</Text>
              <Text style={styles.heroSecondaryBtnArrow}>→</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.heroTertiaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
              onPress={() => router.push("/about")}
            >
              <Text style={styles.heroTertiaryBtnText}>{t.about}</Text>
              <Text style={styles.heroTertiaryBtnArrow}>→</Text>
            </Pressable>
          </View>

          <Text style={styles.footerHint}>
            {Platform.OS === "web" ? t.tipWeb : t.tipMobile}
          </Text>
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
                style={({ pressed }) => [
                  styles.pinCancelBtn,
                  pressed && styles.primaryBtnPressed,
                ]}
                onPress={() => setShowPin(false)}
              >
                <Text style={styles.pinCancelText}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.pinConfirmBtn,
                  pressed && styles.primaryBtnPressed,
                ]}
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
        <Text
          style={[
            props.styles.segmentText,
            isLeft && props.styles.segmentTextActive,
          ]}
        >
          {props.leftLabel}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => props.onChange(props.rightValue)}
        style={[props.styles.segment, !isLeft && props.styles.segmentActive]}
      >
        <Text
          style={[
            props.styles.segmentText,
            !isLeft && props.styles.segmentTextActive,
          ]}
        >
          {props.rightLabel}
        </Text>
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

    hero: {
      width: "100%",
      maxWidth: 860,
      alignItems: "center",
      paddingBottom: 14,
    },
    heroLogo: { width: 190, height: 190, marginBottom: 6 },
    heroTitle: {
      fontSize: 44,
      fontWeight: "900",
      color: c.text,
      letterSpacing: 1.2,
      marginTop: 6,
    },
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

    modeRow: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    },
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
    modeBtnText: {
      color: c.text,
      fontWeight: "900",
      letterSpacing: 0.6,
      fontSize: 12,
    },

    authCard: {
      width: "100%",
      maxWidth: 520,
      marginTop: 14,
      backgroundColor: c.card,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    authTitle: {
      fontSize: 12,
      fontWeight: "900",
      color: c.muted,
      textTransform: "uppercase",
      letterSpacing: 1.6,
      marginBottom: 10,
      textAlign: "center",
    },
    authButtonsRow: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "center",
      flexWrap: "wrap",
    },
    authPrimaryBtn: {
      backgroundColor: c.green,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: c.green,
      minWidth: 160,
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    authPrimaryBtnText: {
      color: "white",
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 1,
      textAlign: "center",
    },
    authSecondaryBtn: {
      backgroundColor: c.segmentBg,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: c.border,
      minWidth: 160,
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    authSecondaryBtnText: {
      color: c.text,
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 1,
      textAlign: "center",
    },
    authHint: {
      marginTop: 10,
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.3,
      fontSize: 12,
      textAlign: "center",
    },

    signedInText: {
      color: c.muted,
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 0.2,
      textAlign: "center",
      marginBottom: 6,
    },
    signedInEmail: { color: c.text, fontWeight: "900" },

    authedQuickRow: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "center",
      flexWrap: "wrap",
      marginBottom: 6,
    },
    authedPrimaryBtn: {
      backgroundColor: c.green,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: c.green,
      minWidth: 160,
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    authedPrimaryBtnText: {
      color: "white",
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 1,
      textAlign: "center",
    },
    authedSecondaryBtn: {
      backgroundColor: c.segmentBg,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: c.border,
      minWidth: 160,
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    authedSecondaryBtnText: {
      color: c.text,
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 1,
      textAlign: "center",
    },

    authDangerBtn: {
      backgroundColor: c.segmentBg,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: c.border,
      minWidth: 240,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
    },
    authDangerBtnText: {
      color: c.text,
      fontSize: 14,
      fontWeight: "900",
      letterSpacing: 1,
      textAlign: "center",
    },

    heroActions: { width: "100%", alignItems: "center", marginTop: 10 },

    heroPrimaryBtn: {
      marginTop: 12,
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
      minWidth: 240,
      alignSelf: "center",
    },
    heroPrimaryBtnText: {
      color: "white",
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 1,
      textAlign: "center",
    },
    heroPrimaryBtnArrow: { color: "white", fontSize: 18, fontWeight: "900" },

    actionHint: {
      marginTop: 8,
      color: c.muted,
      fontWeight: "800",
      letterSpacing: 0.3,
      fontSize: 12,
      textAlign: "center",
    },

    heroSecondaryBtn: {
      marginTop: 12,
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
      minWidth: 240,
      alignSelf: "center",
    },
    heroSecondaryBtnText: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 1,
      textAlign: "center",
    },
    heroSecondaryBtnArrow: { color: c.text, fontSize: 18, fontWeight: "900" },

    heroTertiaryBtn: {
      marginTop: 10,
      backgroundColor: c.segmentBg,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: 28,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: c.border,
      minWidth: 240,
      alignSelf: "center",
    },
    heroTertiaryBtnText: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 1,
      textAlign: "center",
    },
    heroTertiaryBtnArrow: { color: c.text, fontSize: 18, fontWeight: "900" },

    primaryBtnPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

    footerHint: {
      marginTop: 12,
      fontSize: 12,
      letterSpacing: 0.4,
      color: c.muted,
      textAlign: "center",
    },

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
    label: {
      fontSize: 11,
      fontWeight: "900",
      color: c.muted,
      textTransform: "uppercase",
      letterSpacing: 1.6,
      marginBottom: 8,
    },

    segmentWrap: {
      flexDirection: "row",
      backgroundColor: c.segmentBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 3,
      gap: 6,
    },
    segment: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
    segmentActive: { backgroundColor: c.green },
    segmentText: {
      fontWeight: "900",
      color: c.text,
      fontSize: 12,
      letterSpacing: 0.8,
      textAlign: "center",
    },
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
    pinTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 0.6,
      marginBottom: 10,
    },
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
    pinCancelBtn: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
    pinCancelText: { color: c.text, fontWeight: "900", letterSpacing: 0.6 },
    pinConfirmBtn: {
      backgroundColor: c.green,
      borderWidth: 1,
      borderColor: c.green,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
    pinConfirmText: { color: "white", fontWeight: "900", letterSpacing: 0.6 },
  });
