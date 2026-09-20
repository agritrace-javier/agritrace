import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../src/features/auth";
import { supabase } from "../src/services/supabase";

export default function LoginScreen() {
  const router = useRouter();

  const {
    isAuthenticated,
    isLoading,
    refreshMembership,
  } = useAuth();

  const mountedRef = useRef(true);
  const navigationStartedRef = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      isLoading ||
      !isAuthenticated ||
      busy ||
      navigationStartedRef.current
    ) {
      return;
    }

    navigationStartedRef.current = true;
    router.replace("/dashboard");
  }, [
    isAuthenticated,
    isLoading,
    busy,
    router,
  ]);

  const notify = (
    title: string,
    message: string
  ) => {
    if (Platform.OS === "web") {
      globalThis?.alert?.(
        `${title}\n\n${message}`
      );
      return;
    }

    Alert.alert(
      title,
      message,
      [{ text: "OK" }]
    );
  };

  async function onLogin() {
    if (busy) return;

    const normalizedEmail =
      email.trim().toLowerCase();

    setErrorMsg(null);
    setStatus("");

    if (
      !normalizedEmail ||
      !password
    ) {
      const message =
        "Enter your email and password.";

      setErrorMsg(message);

      notify(
        "Missing information",
        message
      );

      return;
    }

    navigationStartedRef.current = false;

    setBusy(true);
    setStatus("Signing in securely...");

    try {
      const loginPromise =
        supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      const timeoutPromise =
        new Promise<never>(
          (_, reject) => {
            setTimeout(
              () => {
                reject(
                  new Error(
                    "Login timed out. Check your internet connection and try again."
                  )
                );
              },
              15000
            );
          }
        );

      const {
        data,
        error,
      } = await Promise.race([
        loginPromise,
        timeoutPromise,
      ]);

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          "Authentication did not return a user."
        );
      }

      if (!data.session) {
        throw new Error(
          "Authentication succeeded but no active session was returned."
        );
      }

      setStatus(
        "Loading your AgriTrace workspace..."
      );

      await refreshMembership();

      if (!mountedRef.current) {
        return;
      }

      navigationStartedRef.current = true;

      setStatus("");
      setBusy(false);

      router.replace("/dashboard");
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Unable to sign in.";

      setBusy(false);
      setStatus("");
      setErrorMsg(message);

      notify(
        "Login error",
        message
      );
    }
  }

  function goSignup() {
    if (busy) return;

    router.push("/signup");
  }

  function goHome() {
    if (busy) return;

    router.replace("/");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({
        ios: "padding",
        android: undefined,
      })}
      style={styles.screen}
    >
      <View style={styles.card}>
        <Pressable
          onPress={goHome}
          disabled={busy}
        >
          <Text style={styles.brand}>
            AgriTrace
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Welcome back
        </Text>

        <Text style={styles.subtitle}>
          Sign in to manage your agricultural
          traceability workspace.
        </Text>

        {status ? (
          <View style={styles.statusRow}>
            <ActivityIndicator
              size="small"
            />

            <Text style={styles.status}>
              {status}
            </Text>
          </View>
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text
              style={styles.errorText}
            >
              {errorMsg}
            </Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@email.com"
            style={styles.input}
            editable={!busy}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Password
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            placeholder="••••••••"
            style={styles.input}
            editable={!busy}
            onSubmitEditing={() => {
              void onLogin();
            }}
          />
        </View>

        <Pressable
          onPress={() => {
            void onLogin();
          }}
          disabled={busy}
          style={({ pressed }) => [
            styles.button,
            (busy || pressed) &&
              styles.buttonPressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <Text
              style={styles.buttonText}
            >
              Log in
            </Text>
          )}
        </Pressable>

        <View style={styles.footerRow}>
          <Text
            style={styles.footerText}
          >
            Don't have an account?
          </Text>

          <Pressable
            onPress={goSignup}
            disabled={busy}
          >
            <Text style={styles.link}>
              Create one
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F7F8F4",
  },

  card: {
    width: "100%",
    maxWidth: 520,
    borderWidth: 1,
    borderColor: "#DDE3DA",
    borderRadius: 22,
    padding: 28,
    gap: 18,
    backgroundColor: "#FFFFFF",
  },

  brand: {
    fontSize: 20,
    fontWeight: "900",
    color: "#173B2B",
  },

  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#132A20",
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#65736B",
  },

  field: {
    gap: 8,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#36483E",
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#D7DDD8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#15251D",
    backgroundColor: "#FFFFFF",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F2",
  },

  status: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#52645A",
  },

  errorBox: {
    borderWidth: 1,
    borderColor: "#E4B8B8",
    backgroundColor: "#FFF4F4",
    padding: 12,
    borderRadius: 12,
  },

  errorText: {
    color: "#9F2727",
    fontWeight: "700",
    lineHeight: 19,
  },

  button: {
    minHeight: 52,
    marginTop: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#173B2B",
  },

  buttonPressed: {
    opacity: 0.72,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
  },

  footerText: {
    color: "#68756E",
  },

  link: {
    color: "#173B2B",
    fontWeight: "800",
  },
});