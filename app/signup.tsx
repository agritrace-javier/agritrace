// app/signup.tsx
import { useRouter } from "expo-router";
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
import { supabase } from "./supabase";

export default function SignupScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);

  async function onSignup() {
    const e = email.trim().toLowerCase();
    const fn = firstName.trim();
    const ln = lastName.trim();
    const wp = workplace.trim();
    const ph = phone.trim();

    if (!fn || !ln || !wp || !ph || !e || !password) {
      Alert.alert("Missing info", "Please complete all fields.");
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
        options: {
          data: {
            first_name: fn,
            last_name: ln,
            workplace: wp,
            phone: ph,
          },
        },
      });

      if (error) throw error;

      // If email confirmation is required, session can be null.
      if (!data.session) {
        Alert.alert(
          "Check your email",
          "Account created. Please confirm your email, then log in."
        );
        router.replace("/login");
        return;
      }

      router.replace("/");
    } catch (err: any) {
      Alert.alert("Signup error", err?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  function goLogin() {
    router.push("/login");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.wrap}
    >
      <View style={styles.card}>
        <Text style={styles.title}>AgriTrace</Text>
        <Text style={styles.subtitle}>Create account</Text>

        <Text style={styles.label}>First name</Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="John"
          style={styles.input}
        />

        <Text style={styles.label}>Last name</Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Doe"
          style={styles.input}
        />

        <Text style={styles.label}>Workplace / Company / Farm</Text>
        <TextInput
          value={workplace}
          onChangeText={setWorkplace}
          placeholder="My Farm Co."
          style={styles.input}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+503 7000-0000"
          keyboardType="phone-pad"
          style={styles.input}
        />

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
          <Pressable onPress={goLogin}>
            <Text style={styles.link}>Log in</Text>
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
