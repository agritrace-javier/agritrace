import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

import { supabase } from "../src/services/supabase";

export default function SignupScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

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

  async function onSignup() {
    if (busy) return;

    const normalizedEmail =
      email.trim().toLowerCase();

    const normalizedFirstName =
      firstName.trim();

    const normalizedLastName =
      lastName.trim();

    const normalizedWorkplace =
      workplace.trim();

    const normalizedPhone =
      phone.trim();

    setErrorMsg(null);
    setStatus("");

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedWorkplace ||
      !normalizedPhone ||
      !normalizedEmail ||
      !password ||
      !confirmPassword
    ) {
      const message =
        "Please complete all fields.";

      setErrorMsg(message);

      notify(
        "Missing information",
        message
      );

      return;
    }

    if (password.length < 8) {
      const message =
        "Your password must contain at least 8 characters.";

      setErrorMsg(message);

      notify(
        "Password too short",
        message
      );

      return;
    }

    if (password !== confirmPassword) {
      const message =
        "The passwords do not match.";

      setErrorMsg(message);

      notify(
        "Password mismatch",
        message
      );

      return;
    }

    setBusy(true);
    setStatus("Creating your account...");

    try {
      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            first_name:
              normalizedFirstName,
            last_name:
              normalizedLastName,
            workplace:
              normalizedWorkplace,
            phone:
              normalizedPhone,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          "Supabase did not return a user after signup."
        );
      }

      if (!data.session) {
        setBusy(false);
        setStatus("");

        notify(
          "Check your email",
          "Your AgriTrace account was created. Confirm your email address, then return to log in."
        );

        router.replace("/login");
        return;
      }

      setStatus(
        "Account created successfully..."
      );

      /*
       * The authenticated user intentionally has no
       * organization yet.
       *
       * The next V2 onboarding step will create:
       *
       * Organization
       *      +
       * Active Owner Membership
       *
       * using the secure create_organization RPC.
       */

      setBusy(false);
      setStatus("");

      router.replace("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create your account.";

      setBusy(false);
      setStatus("");
      setErrorMsg(message);

      notify(
        "Signup error",
        message
      );
    }
  }

  function goLogin() {
    if (busy) return;

    router.replace("/login");
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
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
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

          <View style={styles.heading}>
            <Text style={styles.title}>
              Create your account
            </Text>

            <Text style={styles.subtitle}>
              Start building trusted agricultural
              records from farm to buyer.
            </Text>
          </View>

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

          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Text style={styles.label}>
                First name
              </Text>

              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="John"
                autoComplete="given-name"
                style={styles.input}
                editable={!busy}
              />
            </View>

            <View style={styles.nameField}>
              <Text style={styles.label}>
                Last name
              </Text>

              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Doe"
                autoComplete="family-name"
                style={styles.input}
                editable={!busy}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Company / Farm
            </Text>

            <TextInput
              value={workplace}
              onChangeText={setWorkplace}
              placeholder="Santa Ana Coffee Farm"
              style={styles.input}
              editable={!busy}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Phone
            </Text>

            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 000 0000"
              keyboardType="phone-pad"
              autoComplete="tel"
              style={styles.input}
              editable={!busy}
            />
          </View>

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
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              style={styles.input}
              editable={!busy}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Confirm password
            </Text>

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              placeholder="Enter your password again"
              style={styles.input}
              editable={!busy}
              onSubmitEditing={() => {
                void onSignup();
              }}
            />
          </View>

          <Pressable
            onPress={() => {
              void onSignup();
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
                Create account
              </Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text
              style={styles.footerText}
            >
              Already have an account?
            </Text>

            <Pressable
              onPress={goLogin}
              disabled={busy}
            >
              <Text style={styles.link}>
                Log in
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F8F4",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  card: {
    width: "100%",
    maxWidth: 620,
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

  heading: {
    gap: 7,
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

  nameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  nameField: {
    flexGrow: 1,
    flexBasis: 220,
    gap: 8,
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