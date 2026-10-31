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
import type { CropType } from "./cropTypesService";
import { createPlanting, updatePlanting } from "./plantingsService";
import type { GrowingMethod, Planting } from "./plantingsService";

type Props = {
  organizationId: string;
  fieldId: string;
  cropTypes: CropType[];
  onCreated: (planting: Planting) => void;
  planting?: Planting | null;
  onCancel?: () => void;
  onSavingChange?: (saving: boolean) => void;
  disabled?: boolean;
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

  return "Could not save planting.";
}

export function CreatePlantingForm({
  organizationId,
  fieldId,
  cropTypes,
  onCreated,
  planting = null,
  onCancel,
  onSavingChange,
  disabled = false,
}: Props) {
  const { organization, hasActiveMembership, can } = useAuth();

  const [name, setName] = useState(planting?.name ?? "");
  const [cropTypeId, setCropTypeId] = useState(planting?.crop_type_id ?? "");
  const [variety, setVariety] = useState(planting?.variety ?? "");
  const [growingMethod, setGrowingMethod] =
    useState<GrowingMethod>(planting?.growing_method ?? "perennial");
  const [establishedOn, setEstablishedOn] = useState(planting?.established_on ?? "");
  const [endedOn, setEndedOn] = useState(planting?.ended_on ?? "");
  const [notes, setNotes] = useState(planting?.notes ?? "");
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

  const activeCropTypes = cropTypes.filter(
    (cropType) =>
      cropType.organization_id === organizationId &&
      cropType.is_active
  );

  async function handleCreate() {
    if (savingRef.current || !canManage || disabled) {
      return;
    }

    if (!name.trim()) {
      setError("Please enter a planting name.");
      return;
    }

    if (
      planting &&
      (
        planting.organization_id !== organizationId ||
        planting.field_id !== fieldId
      )
    ) {
      setError("The selected planting is unavailable in this field.");
      return;
    }

    if (
      !planting &&
      !activeCropTypes.some((cropType) => cropType.id === cropTypeId)
    ) {
      setError("Please select an active crop type.");
      return;
    }

    savingRef.current = true;
    onSavingChange?.(true);
    setIsSaving(true);
    setError(null);

    try {
      const input = {
        name,
        variety,
        growing_method: growingMethod,
        established_on: establishedOn,
        ended_on: endedOn,
        notes,
      };

      const savedPlanting = planting
        ? await updatePlanting(organizationId, planting.id, input)
        : await createPlanting({
            ...input,
            organization_id: organizationId,
            field_id: fieldId,
            crop_type_id: cropTypeId,
          });

      if (mountedRef.current) {
        setName("");
        setCropTypeId("");
        setVariety("");
        setGrowingMethod("perennial");
        setEstablishedOn("");
        setEndedOn("");
        setNotes("");
        onCreated(savedPlanting);

        if (planting) {
          onCancel?.();
        }
      }
    } catch (saveError) {
      if (mountedRef.current) {
        setError(getSaveError(saveError));
      }
    } finally {
      savingRef.current = false;
      onSavingChange?.(false);

      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }

  if (!canManage) {
    return null;
  }

  const saveDisabled = disabled || isSaving || (!planting && activeCropTypes.length === 0);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{planting ? "Edit Planting" : "Add Planting"}</Text>
      <Text style={styles.description}>
        Register a perennial planting or an individual growing cycle
        within this field.
      </Text>

      <Text style={styles.label}>Planting name *</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Example: Coffee Bourbon - North"
        placeholderTextColor={colors.light.textSecondary}
        accessibilityLabel="Planting name, required"
        editable={!isSaving}
        style={styles.input}
      />

      <Text style={styles.label}>Crop type *</Text>
            {planting ? (
        <Text style={styles.description}>
          {cropTypes.find((item) => item.id === planting.crop_type_id)?.name
            ?? "Unavailable crop type"}
          {" — Original crop type"}
        </Text>
      ) : activeCropTypes.length === 0 ? (
        <Text style={styles.description}>
          Add an active crop type to your organization catalog first.
        </Text>
      ) : (
        <View style={styles.options}>
          {activeCropTypes.map((cropType) => (
            <Pressable
              key={cropType.id}
              onPress={() => setCropTypeId(cropType.id)}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityState={{
                selected: cropTypeId === cropType.id,
                disabled: isSaving,
              }}
              style={[
                styles.option,
                cropTypeId === cropType.id && styles.selectedOption,
                isSaving && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  cropTypeId === cropType.id && styles.selectedText,
                ]}
              >
                {cropType.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>Variety (optional)</Text>
      <TextInput
        value={variety}
        onChangeText={setVariety}
        placeholder="Example: Bourbon"
        placeholderTextColor={colors.light.textSecondary}
        accessibilityLabel="Variety, optional"
        editable={!isSaving}
        style={styles.input}
      />

      <Text style={styles.label}>Growing method *</Text>
      <View style={styles.options}>
        {(["perennial", "cycle"] as const).map((method) => (
          <Pressable
            key={method}
            onPress={() => setGrowingMethod(method)}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityState={{
              selected: growingMethod === method,
              disabled: isSaving,
            }}
            style={[
              styles.option,
              growingMethod === method && styles.selectedOption,
              isSaving && styles.disabled,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                growingMethod === method && styles.selectedText,
              ]}
            >
              {method === "perennial" ? "Perennial" : "Growing cycle"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>
        Establishment / sowing date (optional)
      </Text>
      <TextInput
        value={establishedOn}
        onChangeText={setEstablishedOn}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.light.textSecondary}
        accessibilityLabel="Establishment or sowing date, YYYY-MM-DD, optional"
        editable={!isSaving}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={10}
        style={styles.input}
      />

      <Text style={styles.label}>Actual end date (optional)</Text>
      <TextInput
        value={endedOn}
        onChangeText={setEndedOn}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.light.textSecondary}
        accessibilityLabel="Actual end date, YYYY-MM-DD, optional"
        editable={!isSaving}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={10}
        style={styles.input}
      />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Planting observations"
        placeholderTextColor={colors.light.textSecondary}
        accessibilityLabel="Planting notes, optional"
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
        disabled={saveDisabled}
        accessibilityRole="button"
        accessibilityState={{
          disabled: saveDisabled,
          busy: isSaving,
        }}
        style={[styles.button, saveDisabled && styles.disabled]}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : null}
        <Text style={styles.buttonText}>
          {isSaving ? "Saving..." : planting ? "Save Changes" : "Create Planting"}
        </Text>
      </Pressable>

      {planting && onCancel ? (
        <Pressable
          onPress={() => {
            if (!savingRef.current) {
              onCancel();
            }
          }}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaving }}
          style={[styles.option, isSaving && styles.disabled]}
        >
          <Text style={styles.optionText}>Cancel</Text>
        </Pressable>
      ) : null}
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  optionText: {
    color: colors.light.text,
    fontSize: typography.size.md,
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
