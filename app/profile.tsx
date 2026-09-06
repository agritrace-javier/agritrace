// app/profile.tsx
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "./supabase";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  workplace: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForSession(maxMs = 8000, intervalMs = 350) {
  const started = Date.now();

  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
  } catch {
    // ignore
  }

  while (Date.now() - started < maxMs) {
    await sleep(intervalMs);
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session;
    } catch {
      // ignore
    }
  }

  return null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [phone, setPhone] = useState("");

  const notify = (title: string, message: string) => {
    if (Platform.OS === "web") {
      // @ts-ignore
      globalThis?.alert?.(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message, [{ text: "OK" }]);
  };

  const canSave = useMemo(() => {
    if (!userId) return false;
    if (busy) return false;

    const f = firstName.trim();
    const l = lastName.trim();
    const w = workplace.trim();
    const p = phone.trim();

    if (!profile) return !!(f || l || w || p);

    const same =
      (profile.first_name ?? "") === f &&
      (profile.last_name ?? "") === l &&
      (profile.workplace ?? "") === w &&
      (profile.phone ?? "") === p;

    return !same;
  }, [userId, profile, firstName, lastName, workplace, phone, busy]);

  async function loadProfileFlow() {
    if (!mountedRef.current) return;

    setErrorMsg(null);
    setLoading(true);

    // ✅ Wait for session instead of assuming it is instantly available
    const session = await waitForSession(8000, 350);

    if (!mountedRef.current) return;

    if (!session) {
      // Not ready yet (or network), but we do NOT lie; we show retry UI.
      setUserId(null);
      setEmail(null);
      setProfile(null);
      setLoading(false);
      setErrorMsg("La sesión está tardando en cargar. Dale Refresh.");
      return;
    }

    const uid = session.user.id;
    setUserId(uid);
    setEmail(session.user.email ?? null);

    // Fetch profile row (can be null if not created yet)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, workplace, phone, created_at, updated_at")
      .eq("id", uid)
      .maybeSingle();

    if (!mountedRef.current) return;

    if (error) {
      setProfile(null);
      setLoading(false);
      setErrorMsg(error.message ?? "Profile load error");
      return;
    }

    const prof = (data ?? null) as ProfileRow | null;
    setProfile(prof);

    if (prof) {
      setFirstName((prof.first_name ?? "").toString());
      setLastName((prof.last_name ?? "").toString());
      setWorkplace((prof.workplace ?? "").toString());
      setPhone((prof.phone ?? "").toString());
    }

    setLoading(false);
  }

  useEffect(() => {
    mountedRef.current = true;

    loadProfileFlow();

    // If auth state changes, try again
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadProfileFlow();
    });

    return () => {
      mountedRef.current = false;
      sub?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave() {
    if (!userId) return;

    setErrorMsg(null);
    setBusy(true);

    try {
      const payload = {
        id: userId,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        workplace: workplace.trim() || null,
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;

      notify("Guardado", "Tu perfil fue actualizado.");
      await loadProfileFlow();
    } catch (err: any) {
      const msg = err?.message ?? "Unknown error";
      setErrorMsg(msg);
      notify("Error", msg);
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/");
    } catch (err: any) {
      notify("Logout error", err?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.muted}>Loading profile…</Text>

        <Pressable style={styles.secondaryBtn} onPress={loadProfileFlow}>
          <Text style={styles.secondaryBtnText}>Refresh</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => router.push("/")}>
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  // If session is still slow, show retry instead of pretending logged out instantly
  if (!userId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.muted}>
          No pude leer la sesión todavía. (Esto suele pasar por túnel/red lenta)
        </Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <Pressable style={styles.primaryBtn} onPress={loadProfileFlow}>
          <Text style={styles.primaryBtnText}>Refresh</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => router.push("/")}>
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{email ?? "(no email)"}</Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>User info</Text>

          <Text style={styles.label}>First name</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            style={styles.input}
            editable={!busy}
          />

          <Text style={styles.label}>Last name</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            style={styles.input}
            editable={!busy}
          />

          <Text style={styles.label}>Workplace</Text>
          <TextInput
            value={workplace}
            onChangeText={setWorkplace}
            placeholder="Workplace"
            style={styles.input}
            editable={!busy}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone"
            style={styles.input}
            keyboardType="phone-pad"
            editable={!busy}
          />

          <Pressable
            onPress={onSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.primaryBtn,
              (!canSave || pressed) && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>{busy ? "Saving…" : "Save changes"}</Text>
          </Pressable>

          <Pressable
            onPress={loadProfileFlow}
            disabled={busy}
            style={({ pressed }) => [
              styles.secondaryBtn,
              (busy || pressed) && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryBtnText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable style={styles.secondaryBtn} onPress={() => router.push("/")}>
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.dangerBtn, pressed && styles.buttonPressed]}
            onPress={onLogout}
            disabled={busy}
          >
            <Text style={styles.dangerBtnText}>{busy ? "…" : "Log out"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0F1A", padding: 16 },
  scroll: { paddingBottom: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "white", marginTop: 8 },
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#121A2A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  sectionTitle: { color: "white", fontSize: 16, fontWeight: "800", marginBottom: 2 },
  label: { color: "rgba(255,255,255,0.7)", fontSize: 12, letterSpacing: 0.2 },
  value: { color: "white", fontSize: 16, fontWeight: "600" },
  muted: { color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "white",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  errorBox: {
    borderWidth: 1,
    borderColor: "rgba(255,0,0,0.25)",
    backgroundColor: "rgba(255,0,0,0.06)",
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  errorText: { color: "#FF6B6B", fontWeight: "700" },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "white", fontWeight: "800", fontSize: 14 },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    marginTop: 10,
    flex: 1,
  },
  secondaryBtnText: { color: "white", fontWeight: "800", fontSize: 14 },
  dangerBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255, 0, 0, 0.18)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 0, 0.25)",
    flex: 1,
  },
  dangerBtnText: { color: "white", fontWeight: "800", fontSize: 14 },
  buttonPressed: { opacity: 0.6 },
  row: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 10 },
});
