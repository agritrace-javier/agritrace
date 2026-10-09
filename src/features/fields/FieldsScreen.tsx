import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

import { useAuth } from "../auth";

import {
    colors,
    layout,
    radius,
    spacing,
    typography,
} from "../../theme/tokens";

import {
    getFieldsByFarm
} from "./fieldsService";

import type { Field } from "./fieldsService";

export function FieldsScreen() {
  const {
    user,
    organization,
    hasActiveMembership,
    can,
  } = useAuth();

  const [fields, setFields] = useState<Field[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [farmId, setFarmId] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [soilType, setSoilType] = useState("");
  const [elevation, setElevation] = useState("");

  const canManageFields = can("farms.manage");

  const loadFields = useCallback(async () => {
    if (!organization?.id || !farmId) {
      setFields([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getFieldsByFarm(
        organization.id,
        farmId
      );

      setFields(data);
    } catch (loadError) {
      console.warn(
        "[fields] Could not load fields:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load fields."
      );
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, farmId]);

  useEffect(() => {
    if (!hasActiveMembership) {
      return;
    }

    void loadFields();
  }, [
    hasActiveMembership,
    loadFields,
  ]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={colors.light.text}
            />

            <Text style={styles.backText}>
              Farms
            </Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>
              FIELD MANAGEMENT
            </Text>

            <Text style={styles.title}>
              Fields
            </Text>

            <Text style={styles.subtitle}>
              Manage agricultural fields within a farm.
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={colors.light.error}
            />

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" />

            <Text style={styles.loadingText}>
              Loading fields...
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },

  container: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
  },

  topBar: {
    marginBottom: spacing.lg,
  },

  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  backText: {
    color: colors.light.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  headerCopy: {
    flex: 1,
    minWidth: 260,
  },

  eyebrow: {
    color: colors.brand.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 2,
  },

  title: {
    marginTop: spacing.xs,
    color: colors.light.text,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.extraBold,
  },

  subtitle: {
    marginTop: spacing.sm,
    maxWidth: 620,
    color: colors.light.textSecondary,
    fontSize: typography.size.md,
    lineHeight: 24,
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  errorText: {
    flex: 1,
    color: colors.light.error,
    fontSize: typography.size.sm,
  },

  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
  },

  loadingText: {
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
  },
});