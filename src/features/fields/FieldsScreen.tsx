import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
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
    createField,
    getFieldsByFarm,
} from "./fieldsService";

import type { Field } from "./fieldsService";

export function FieldsScreen() {
    const { farmId } = useLocalSearchParams<{
  farmId: string;
}>();
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



  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [soilType, setSoilType] = useState("");
  const [elevation, setElevation] = useState("");

  const canManageFields = can("farms.manage");
const handleCreateField = async () => {  if (isCreating) return;
  if (!organization?.id || !farmId || !user?.id) {
    Alert.alert(
      "Organization unavailable",
      "The organization or farm could not be determined."
    );
    return;
  }

  if (!canManageFields) {
    Alert.alert(
      "Permission required",
      "Your role cannot create fields."
    );
    return;
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    Alert.alert(
      "Field name required",
      "Please enter a field name."
    );
    return;
  }

  const parseOptionalNumber = (
    value: string,
    label: string
  ): number | null => {
    if (!value.trim()) return null;

    const parsed = Number(value.trim());

    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(
        `${label} must be a valid non-negative number.`
      );
    }

    return parsed;
  };

  try {
    const areaHectares = parseOptionalNumber(area, "Area");
    const elevationMeters = parseOptionalNumber(
      elevation,
      "Elevation"
    );

    setIsCreating(true);
    setError(null);

    const field = await createField({
      organization_id: organization.id,
      farm_id: farmId,
      name: trimmedName,
      code: code.trim() || null,
      area_hectares: areaHectares,
      soil_type: soilType.trim() || null,
      elevation_meters: elevationMeters,
      description: description.trim() || null,
    });

    setFields((current) => [...current, field]);

    setName("");
    setCode("");
    setArea("");
    setSoilType("");
    setElevation("");
    setDescription("");

    Alert.alert(
      "Field created",
      `${field.name} was registered successfully.`
    );
  } catch (createError) {
    const message =
      createError instanceof Error
        ? createError.message
        : "Could not create field.";

    setError(message);
    Alert.alert("Could not create field", message);
  } finally {
    setIsCreating(false);
  }
};

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
{canManageFields ? (
  <View
    style={{
      backgroundColor: colors.light.surface,
      borderWidth: 1,
      borderColor: colors.light.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      gap: spacing.md,
    }}
  >
    <Text
      style={{
        color: colors.light.text,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
      }}
    >
      Add Field
    </Text>

    <TextInput
      value={name}
      onChangeText={setName}
      placeholder="Field name *"
      placeholderTextColor={colors.light.textSecondary}
      style={{
        minHeight: 48,
        borderWidth: 1,
        borderColor: colors.light.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        color: colors.light.text,
      }}
    />
    <TextInput
  value={code}
  onChangeText={setCode}
  placeholder="Field code (optional) - Example: FIELD-001"
  placeholderTextColor={colors.light.textSecondary}
  autoCapitalize="characters"
  style={{
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.light.text,
  }}
/>
    <TextInput
      value={area}
      onChangeText={setArea}
      placeholder="Area (hectares, optional) - Example: 2.5"
      placeholderTextColor={colors.light.textSecondary}
      keyboardType="decimal-pad"
      editable={!isCreating}
      style={{
        minHeight: 48,
        borderWidth: 1,
        borderColor: colors.light.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        color: colors.light.text,
      }}
    />
        <TextInput
      value={soilType}
      onChangeText={setSoilType}
      placeholder="Soil type (optional) - Example: Clay loam"
      placeholderTextColor={colors.light.textSecondary}
      autoCapitalize="sentences"
      editable={!isCreating}
      style={{
        minHeight: 48,
        borderWidth: 1,
        borderColor: colors.light.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        color: colors.light.text,
      }}
    />
        <TextInput
      value={elevation}
      onChangeText={setElevation}
      placeholder="Elevation (meters, optional) - Example: 850"
      placeholderTextColor={colors.light.textSecondary}
      keyboardType="decimal-pad"
      editable={!isCreating}
      style={{
        minHeight: 48,
        borderWidth: 1,
        borderColor: colors.light.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        color: colors.light.text,
      }}
    />
        <TextInput
      value={description}
      onChangeText={setDescription}
      placeholder="Description (optional)"
      placeholderTextColor={colors.light.textSecondary}
      multiline
      textAlignVertical="top"
      editable={!isCreating}
      style={{
        minHeight: 110,
        borderWidth: 1,
        borderColor: colors.light.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        color: colors.light.text,
      }}
    />
        <Pressable
      onPress={handleCreateField}
      disabled={isCreating}
      accessibilityRole="button"
      style={{
        minHeight: 48,
        backgroundColor: colors.brand.primary,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        opacity: isCreating ? 0.6 : 1,
      }}
    >
      {isCreating ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
      )}

      <Text
        style={{
          color: "#FFFFFF",
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
        }}
      >
        {isCreating ? "Creating..." : "Create Field"}
      </Text>
    </Pressable>
  </View>
) : null}
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
) : error ? null : (
  <View style={{ gap: spacing.md }}>
    <Text
      style={{
        color: colors.light.text,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
      }}
    >
      Registered Fields ({fields.length})
    </Text>

    {fields.length === 0 ? (
      <View style={styles.loadingCard}>
        <Ionicons
          name="grid-outline"
          size={36}
          color={colors.light.textSecondary}
        />

        <Text
          style={{
            color: colors.light.text,
            fontSize: typography.size.md,
            fontWeight: typography.weight.bold,
          }}
        >
          No fields yet
        </Text>

        <Text
          style={{
            color: colors.light.textSecondary,
            textAlign: "center",
          }}
        >
          No agricultural fields have been registered
          for this farm.
        </Text>
      </View>
    ) : (
      fields.map((field) => (
        <View
          key={field.id}
          style={{
            backgroundColor: colors.light.surface,
            borderWidth: 1,
            borderColor: colors.light.border,
            borderRadius: radius.md,
            padding: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <Text
            style={{
              color: colors.light.text,
              fontSize: typography.size.md,
              fontWeight: typography.weight.bold,
            }}
          >
            {field.name}
          </Text>

          {field.code ? (
            <Text style={{ color: colors.light.textSecondary }}>
              Code: {field.code}
            </Text>
          ) : null}

          {field.area_hectares !== null ? (
            <Text style={{ color: colors.brand.primary }}>
              {field.area_hectares} hectares
            </Text>
          ) : null}

          <Text style={{ color: colors.light.textSecondary }}>
            Status: {field.is_active ? "Active" : "Inactive"}
          </Text>

          {field.description ? (
            <Text style={{ color: colors.light.textSecondary }}>
              {field.description}
            </Text>
          ) : null}
        </View>
      ))
    )}
  </View>
)}
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