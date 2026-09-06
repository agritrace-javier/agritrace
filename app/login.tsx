// app/login.tsx
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase, SUPABASE_URL } from "./supabase";

export default function LoginScreen() {
  const router = useRouter();
  const mountedRef = useRef(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const notify = (title: string, message: string) => {
    if (Platform.OS === "web") {
      // @ts-ignore
      globalThis?.alert?.(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message, [{ text: "OK" }]);
  };

  async function supabaseHealthCheck(timeoutMs = 5000) {
    if (!SUPABASE_URL) return { ok: false, error: "SUPABASE_URL missing" };

    const url = `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/health`;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });

      // Supabase health endpoint should return 200
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `Health not OK (${res.status}). ${text}` };
      }

      return { ok: true };
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "Health check timeout"
          : e?.message ?? String(e);
      return { ok: false, error: msg };
    } finally {
      clearTimeout(t);
    }
  }

  async function onLogin() {
    if (busy) return;

    setErrorMsg(null);
    setStatus("");

    const e = email.trim().toLowerCase();
    if (!e || !password) {
      const msg = "Escribe email y contraseña.";
      setErrorMsg(msg);
      notify("Falta info", msg);
      return;
    }

    setBusy(true);

    // ✅ Step 1: connectivity check
    setStatus("Verificando conexión a Supabase…");
    const health = await supabaseHealthCheck(6000);
    if (!health.ok) {
      setBusy(false);
      setStatus("");
      const msg =
        "No hay conexión estable con Supabase desde este dispositivo.\n\n" +
        `Detalle: ${health.error}\n\n` +
        "Solución rápida:\n" +
        "1) Reinicia Expo en modo tunnel\n" +
        "2) Asegúrate que el móvil tiene internet\n" +
        "3) Verifica que SUPABASE_URL es correcto";
      setErrorMsg(msg);
      notify("Conexión falló", msg);
      return;
    }

    // ✅ Step 2: watchdog for sign in
    setStatus("Iniciando sesión…");

    let finished = false;
    const watchdog = setTimeout(() => {
      if (finished) return;
      finished = true;
      if (!mountedRef.current) return;

      setBusy(false);
      setStatus("");
      const msg =
        "Login se quedó colgado (timeout). Esto es casi siempre red/túnel.\n\n" +
        "Haz esto:\n" +
        "1) Para Expo\n" +
        "2) Corre: npx expo start --tunnel\n" +
        "3) Vuelve a intentar login";
      setErrorMsg(msg);
      notify("Timeout", msg);
    }, 12000);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: e,
        password,
      });

      if (finished) return;
      finished = true;
      clearTimeout(watchdog);

      if (error) {
        setBusy(false);
        setStatus("");
        setErrorMsg(error.message);
        notify("Error de login", error.message);
        return;
      }

      // Confirm session
      setStatus("Confirmando sesión…");
      const { data: sData, error: sErr } = await supabase.auth.getSession();

      if (sErr) {
        setBusy(false);
        setStatus("");
        setErrorMsg(sErr.message);
        notify("Error de sesión", sErr.message);
        return;
      }

      const session = sData.session ?? data.session ?? null;

      if (!session) {
        setBusy(false);
        setStatus("");
        const msg =
          "Login OK pero la sesión no está lista todavía. Intenta otra vez.";
        setErrorMsg(msg);
        notify("Sesión no lista", msg);
        return;
      }

      setBusy(false);
      setStatus("");
      router.replace("/profile");
    } catch (err: any) {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);

      const msg = err?.message ?? "Unknown error";
      setBusy(false);
      setStatus("");
      setErrorMsg(msg);
      notify("Login error", msg);
    }
  }

  function goSignup() {
    router.push("/signup");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.wrap}
    >
      <View style={styles.card}>
        <Text style={styles.title}>AgriTrace</Text>
        <Text style={styles.subtitle}>Log in</Text>

        {status ? <Text style={styles.status}>{status}</Text> : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@email.com"
          style={styles.input}
          editable={!busy}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          style={styles.input}
          editable={!busy}
        />

        <Pressable
          onPress={onLogin}
          disabled={busy}
          style={({ pressed }) => [
            styles.button,
            (busy || pressed) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>{busy ? "Entrando..." : "Log in"}</Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>No tienes cuenta?</Text>
          <Pressable onPress={goSignup} disabled={busy}>
            <Text style={styles.link}>Crear una</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 16 },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 18, fontWeight: "700" },
  status: { fontSize: 13, fontWeight: "700", opacity: 0.75 },
  label: { fontSize: 13, opacity: 0.8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: "rgba(255,0,0,0.25)",
    backgroundColor: "rgba(255,0,0,0.06)",
    padding: 10,
    borderRadius: 12,
  },
  errorText: { color: "#B00020", fontWeight: "700" },
  button: {
    marginTop: 6,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#111",
  },
  buttonPressed: { opacity: 0.6 },
  buttonText: { fontSize: 16, fontWeight: "700" },
  footerRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  footerText: { opacity: 0.8 },
  link: { fontWeight: "700", textDecorationLine: "underline" },
});
