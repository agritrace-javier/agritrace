import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../auth";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import { createCropType } from "./cropTypesService";
import type { CropType } from "./cropTypesService";

type Props = {
  organizationId: string;
  onCreated: (cropType: CropType) => void;
};

function getSaveError(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    if ("code" in error && error.code === "23505") {
      return "This crop type already exists in your organization.";
    }

    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  return "Could not create crop type.";
}

export function CreateCropTypeForm({
  organizationId,
  onCreated,
}: Props) {
  const { organization, hasActiveMembership, can } = useAuth();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const canManage =
    hasActiveMembership &&
    organization?.id === organizationId &&
    can("farms.manage");

  async function handleCreate() {
    if (savingRef.current || !canManage) {
      return;
    }

    if (!name.trim()) {
      setError("Please enter a crop type name.");
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      const cropType = await createCropType({
        organization_id: organizationId,
        name,
      });

      if (mountedRef.current) {
        setName("");
        onCreated(cropType);
      }
    } catch (saveError) {
      if (mountedRef.current) {
        setError(getSaveError(saveError));
      }
    } finally {
      savingRef.current = false;

      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }

  if (!canManage) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Add Crop Type</Text>
      <Text style={styles.description}>
        Add a crop to your organization catalog before registering a planting.
      </Text>

      <Text style={styles.label}>Crop type name *</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Example: Coffee"
        placeholderTextColor={colors.light.textSecondary}
        accessibilityLabel="Crop type name, required"
        editable={!isSaving}
        autoCapitalize="words"
        style={styles.input}
      />

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={handleCreate}
        disabled={isSaving}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaving, busy: isSaving }}
        style={[styles.button, isSaving && styles.disabled]}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : null}
        <Text style={styles.buttonText}>
          {isSaving ? "Saving..." : "Create Crop Type"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    color: colors.light.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  description: {
    color: colors.light.textSecondary,
    fontSize: typography.size.md,
  },
  label: {
    color: colors.light.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.light.text,
  },
  error: {
    color: colors.light.error,
    fontSize: typography.size.sm,
  },
  button: {
    minHeight: 48,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },
  disabled: {
    opacity: 0.6,
  },
});
