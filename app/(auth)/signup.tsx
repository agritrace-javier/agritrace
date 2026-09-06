import { Link, useRouter } from "expo-router";
import { useState } from "react";
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
import { supabase } from "../supabase";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSignup() {
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      Alert.alert("Missing info", "Please enter email and password.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak password", "Use at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: e,
        password,
      });

      if (error) throw error;

      // Supabase can require email confirmation depending on project settings
      if (!data.session) {
        Alert.alert(
          "Check your email",
          "Account created. Please confirm your email, then log in."
        );
        router.replace("/(auth)/login");
        return;
      }

      // ✅ immediate session → go home
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Signup error", err?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.wrap}
    >
      <View style={styles.card}>
        <Text style={styles.title}>AgriTrace</Text>
        <Text style={styles.subtitle}>Create account</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@email.com"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="min 8 chars"
          style={styles.input}
        />

        <Pressable
          onPress={onSignup}
          disabled={busy}
          style={({ pressed }) => [
            styles.button,
            (busy || pressed) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {busy ? "Creating..." : "Sign up"}
          </Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.link}>Log in</Text>
            </Pressable>
          </Link>
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
  label: { fontSize: 13, opacity: 0.8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
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
