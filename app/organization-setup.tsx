import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import { useAuth } from "../src/features/auth";
import { supabase } from "../src/services/supabase";

type CreateOrganizationResult = {
  id: string;
  name: string;
  slug: string | null;
};

function createSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function OrganizationSetupScreen() {
  const router = useRouter();

  const {
    user,
    isAuthenticated,
    isLoading,
    hasActiveMembership,
    organization,
    role,
    refreshMembership,
    signOut,
  } = useAuth();

  const [organizationName, setOrganizationName] =
    useState("");

  const [slug, setSlug] = useState("");
  const [slugWasEdited, setSlugWasEdited] =
    useState(false);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const suggestedSlug = useMemo(
    () => createSlug(organizationName),
    [organizationName]
  );

  useEffect(() => {
    if (!slugWasEdited) {
      setSlug(suggestedSlug);
    }
  }, [suggestedSlug, slugWasEdited]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (
      hasActiveMembership &&
      organization &&
      role
    ) {
      router.replace("/dashboard");
    }
  }, [
    isLoading,
    isAuthenticated,
    hasActiveMembership,
    organization,
    role,
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

  async function createOrganization() {
    if (busy) return;

    const normalizedName =
      organizationName.trim();

    const normalizedSlug =
      createSlug(slug);

    setErrorMsg(null);
    setStatus("");

    if (!normalizedName) {
      const message =
        "Enter your organization name.";

      setErrorMsg(message);
      notify(
        "Organization name required",
        message
      );
      return;
    }

    if (normalizedName.length < 2) {
      const message =
        "Organization name must contain at least 2 characters.";

      setErrorMsg(message);
      notify(
        "Organization name too short",
        message
      );
      return;
    }

    if (!normalizedSlug) {
      const message =
        "Enter a valid organization slug.";

      setErrorMsg(message);
      notify(
        "Organization slug required",
        message
      );
      return;
    }

    if (normalizedSlug.length < 3) {
      const message =
        "Organization slug must contain at least 3 characters.";

      setErrorMsg(message);
      notify(
        "Organization slug too short",
        message
      );
      return;
    }

    if (!user) {
      const message =
        "Your authenticated session is not available. Please log in again.";

      setErrorMsg(message);
      notify(
        "Session unavailable",
        message
      );
      return;
    }

    setBusy(true);
    setStatus(
      "Creating your AgriTrace organization..."
    );

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "create_organization",
        {
          organization_name:
            normalizedName,
          organization_slug:
            normalizedSlug,
        }
      );

      if (error) {
        throw error;
      }

      const createdOrganization =
        data as unknown as
          | CreateOrganizationResult
          | CreateOrganizationResult[]
          | null;

      if (!createdOrganization) {
        throw new Error(
          "The organization was created but Supabase did not return its record."
        );
      }

      setStatus(
        "Activating Owner access..."
      );

      await refreshMembership();

      setStatus(
        "Organization ready."
      );

      router.replace("/dashboard");
    } catch (error) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : "Unable to create organization.";

      let message = rawMessage;

      if (
        rawMessage
          .toLowerCase()
          .includes("duplicate") ||
        rawMessage
          .toLowerCase()
          .includes("unique") ||
        rawMessage
          .toLowerCase()
          .includes("already exists")
      ) {
        message =
          "That organization slug is already in use. Choose a different slug and try again.";
      }

      setErrorMsg(message);

      notify(
        "Organization setup error",
        message
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  async function logout() {
    if (busy) return;

    setBusy(true);

    try {
      await signOut();
      router.replace("/login");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading your AgriTrace workspace...
        </Text>
      </View>
    );
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
          <View style={styles.topRow}>
            <Pressable
              onPress={() =>
                router.replace("/")
              }
              disabled={busy}
            >
              <Text style={styles.brand}>
                AgriTrace
              </Text>
            </Pressable>

            <View style={styles.secureBadge}>
              <Text
                style={styles.secureBadgeText}
              >
                SECURE WORKSPACE
              </Text>
            </View>
          </View>

          <View style={styles.heading}>
            <Text style={styles.eyebrow}>
              ORGANIZATION SETUP
            </Text>

            <Text style={styles.title}>
              Create your workspace
            </Text>

            <Text style={styles.subtitle}>
              Your organization is the secure
              foundation for farms, team members,
              lots, traceability records and
              verification activity in AgriTrace.
            </Text>
          </View>

          <View style={styles.ownerBox}>
            <View style={styles.ownerNumber}>
              <Text
                style={styles.ownerNumberText}
              >
                01
              </Text>
            </View>

            <View style={styles.ownerContent}>
              <Text style={styles.ownerTitle}>
                You will become the Owner
              </Text>

              <Text
                style={styles.ownerDescription}
              >
                This account will receive the first
                active Owner membership for the new
                organization.
              </Text>
            </View>
          </View>

          {status ? (
            <View style={styles.statusRow}>
              <ActivityIndicator
                size="small"
              />

              <Text style={styles.statusText}>
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
              Organization name
            </Text>

            <TextInput
              value={organizationName}
              onChangeText={
                setOrganizationName
              }
              placeholder="Example: Santa Ana Coffee Cooperative"
              style={styles.input}
              editable={!busy}
              maxLength={120}
            />

            <Text style={styles.helper}>
              This is the name your team will
              recognize inside AgriTrace.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Organization slug
            </Text>

            <View style={styles.slugRow}>
              <View
                style={styles.slugPrefix}
              >
                <Text
                  style={styles.slugPrefixText}
                >
                  agritrace /
                </Text>
              </View>

              <TextInput
                value={slug}
                onChangeText={(value) => {
                  setSlugWasEdited(true);
                  setSlug(
                    createSlug(value)
                  );
                }}
                placeholder="santa-ana-coffee"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.slugInput}
                editable={!busy}
                maxLength={60}
              />
            </View>

            <Text style={styles.helper}>
              A unique identifier for your
              organization. You can use letters,
              numbers and hyphens.
            </Text>
          </View>

          <View style={styles.architectureBox}>
            <Text
              style={styles.architectureTitle}
            >
              Your AgriTrace structure
            </Text>

            <Text
              style={styles.architectureText}
            >
              Organization → Farms → Fields →
              Harvests → Lots → Traceability →
              Verification
            </Text>
          </View>

          <Pressable
            onPress={() => {
              void createOrganization();
            }}
            disabled={busy}
            style={({ pressed }) => [
              styles.primaryButton,
              (busy || pressed) &&
                styles.buttonPressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator />
            ) : (
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Create organization
              </Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Signed in as
            </Text>

            <Text style={styles.emailText}>
              {user?.email ??
                "Authenticated user"}
            </Text>

            <Pressable
              onPress={() => {
                void logout();
              }}
              disabled={busy}
            >
              <Text style={styles.logoutText}>
                Sign out
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
    backgroundColor: "#F4F6F1",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "#F4F6F1",
  },

  loadingText: {
    color: "#58675F",
    fontSize: 14,
    fontWeight: "700",
  },

  card: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#DCE3DC",
    padding: 32,
    gap: 24,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  brand: {
    color: "#163B2A",
    fontSize: 22,
    fontWeight: "900",
  },

  secureBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#EDF4EE",
  },

  secureBadgeText: {
    color: "#376248",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  heading: {
    gap: 8,
  },

  eyebrow: {
    color: "#52735F",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  title: {
    color: "#12281E",
    fontSize: 36,
    fontWeight: "900",
  },

  subtitle: {
    maxWidth: 600,
    color: "#637168",
    fontSize: 15,
    lineHeight: 23,
  },

  ownerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#F4F8F4",
    borderWidth: 1,
    borderColor: "#DDE8DF",
  },

  ownerNumber: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#173B2B",
  },

  ownerNumberText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },

  ownerContent: {
    flex: 1,
    gap: 3,
  },

  ownerTitle: {
    color: "#173B2B",
    fontSize: 15,
    fontWeight: "900",
  },

  ownerDescription: {
    color: "#65736B",
    fontSize: 13,
    lineHeight: 19,
  },

  field: {
    gap: 8,
  },

  label: {
    color: "#33483C",
    fontSize: 13,
    fontWeight: "800",
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D6DDD7",
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    color: "#17261E",
    fontSize: 16,
  },

  helper: {
    color: "#7A867F",
    fontSize: 12,
    lineHeight: 18,
  },

  slugRow: {
    minHeight: 52,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#D6DDD7",
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  slugPrefix: {
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: "#F3F5F2",
    borderRightWidth: 1,
    borderRightColor: "#D6DDD7",
  },

  slugPrefixText: {
    color: "#728078",
    fontSize: 14,
    fontWeight: "700",
  },

  slugInput: {
    flex: 1,
    minWidth: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#17261E",
    fontSize: 15,
  },

  architectureBox: {
    gap: 7,
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#FAFBF8",
    borderWidth: 1,
    borderColor: "#E3E7E2",
  },

  architectureTitle: {
    color: "#344A3D",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  architectureText: {
    color: "#66746C",
    fontSize: 13,
    lineHeight: 20,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#EFF5F0",
  },

  statusText: {
    flex: 1,
    color: "#50645A",
    fontSize: 13,
    fontWeight: "700",
  },

  errorBox: {
    borderWidth: 1,
    borderColor: "#E4B8B8",
    backgroundColor: "#FFF4F4",
    padding: 13,
    borderRadius: 12,
  },

  errorText: {
    color: "#9F2727",
    fontWeight: "700",
    lineHeight: 19,
  },

  primaryButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#173B2B",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  buttonPressed: {
    opacity: 0.72,
  },

  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
    paddingTop: 4,
  },

  footerText: {
    color: "#7A867F",
    fontSize: 12,
  },

  emailText: {
    color: "#45584D",
    fontSize: 12,
    fontWeight: "800",
  },

  logoutText: {
    marginLeft: 4,
    color: "#173B2B",
    fontSize: 12,
    fontWeight: "900",
  },
});