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
import { createHarvest } from "./harvestsService";
import type { Harvest, HarvestUnit } from "./harvestsService";

type Props = {
  organizationId: string;
  plantingId: string;
  onCreated: (harvest: Harvest) => void;
};

function getSaveError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Could not create harvest.";
}

export function CreateHarvestForm({
  organizationId,
  plantingId,
  onCreated,
}: Props) {
  const { organization, hasActiveMembership, can } = useAuth();

  const [name, setName] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<HarvestUnit>("kg");
  const [notes, setNotes] = useState("");
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

    setError(null);

    if (!name.trim()) {
      setError("Please enter a harvest name.");
      return;
    }

    const quantityText = quantity.trim();

    if (!/^\d+(\.\d{1,3})?$/.test(quantityText)) {
      setError(
        "Enter a positive quantity with up to three decimal places. Use a decimal point."
      );
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    try {
      const harvest = await createHarvest({
        organization_id: organizationId,
        planting_id: plantingId,
        name,
        harvest_date: harvestDate,
        quantity: Number(quantityText),
        unit,
        notes,
      });

      if (mountedRef.current) {
        setName("");
        setHarvestDate("");
        setQuantity("");
        setUnit("kg");
        setNotes("");
        onCreated(harvest);
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
      <Text style={styles.heading}>Add Harvest</Text>
      <Text style={styles.body}>
        Record a harvest collected from this planting.
      </Text>

      <Text style={styles.label}>Harvest name *</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Example: Coffee harvest 01"
        placeholderTextColor={colors.light.textSecondary}
        accessibilityLabel="Harvest name, required"
        editable={!isSaving}
        style={styles.input}
      />

      <Text style={styles.label}>Harvest date *</Text>
      <TextInput
        value={harvestDate}
        onChangeText={setHarvestDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.light.textSecondary}
        accessibilityLabel="Harvest date, YYYY-MM-DD, required"
        editable={!isSaving}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={10}
        style={styles.input}
      />

      <Text style={styles.label}>Quantity *</Text>
      <TextInput
        value={quantity}
        onChangeText={setQuantity}
        placeholder="Example: 250 or 250.5"
        placeholderTextColor={colors.light.textSecondary}
        accessibilityLabel="Harvest quantity, required"
        editable={!isSaving}
        keyboardType="decimal-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Unit *</Text>
      <View style={styles.options}>
        {(["kg", "g", "lb"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setUnit(value)}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityState={{
              selected: unit === value,
              disabled: isSaving,
            }}
            style={[
              styles.option,
              unit === value && styles.selectedOption,
              isSaving && styles.disabled,
            ]}
          >
            <Text
              style={[
                styles.body,
                unit === value && styles.selectedText,
              ]}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Harvest observations"
        placeholderTextColor={colors.light.textSecondary}
        accessibilityLabel="Harvest notes, optional"
        editable={!isSaving}
        multiline
        textAlignVertical="top"
        style={[styles.input, styles.notes]}
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
          {isSaving ? "Saving..." : "Create Harvest"}
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
  body: {
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
  notes: {
    minHeight: 100,
    paddingVertical: spacing.md,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  option: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedOption: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary,
  },
  selectedText: {
    color: "#FFFFFF",
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
