import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
  createFarm,
  getFarms,
} from "./farmsService";

import type { Farm } from "./types";

export function FarmsScreen() {
  const {
    user,
    organization,
    hasActiveMembership,
    can,
  } = useAuth();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");

  const canManageFarms = can("farms.manage");

  const loadFarms = useCallback(async () => {
    if (!organization?.id) {
      setFarms([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getFarms(organization.id);

      setFarms(data);
    } catch (loadError) {
      console.warn(
        "[farms] Could not load farms:",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load farms."
      );
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (!hasActiveMembership) {
      return;
    }

    void loadFarms();
  }, [
    hasActiveMembership,
    loadFarms,
  ]);

  const resetForm = () => {
    setName("");
    setCountry("");
    setRegion("");
    setMunicipality("");
    setArea("");
    setDescription("");
  };

  const handleCreateFarm = async () => {
    if (!organization?.id || !user?.id) {
      Alert.alert(
        "Organization unavailable",
        "Your active organization could not be determined."
      );
      return;
    }

    if (!canManageFarms) {
      Alert.alert(
        "Permission required",
        "Your role cannot create or manage farms."
      );
      return;
    }

    const trimmedName = name.trim();
    const trimmedCountry = country.trim();

    if (!trimmedName) {
      Alert.alert(
        "Farm name required",
        "Enter a name for the farm."
      );
      return;
    }

    if (!trimmedCountry) {
      Alert.alert(
        "Country required",
        "Enter the country where the farm is located."
      );
      return;
    }

    let totalAreaHectares: number | null = null;

    if (area.trim()) {
      const parsedArea = Number(area.trim());

      if (
        !Number.isFinite(parsedArea) ||
        parsedArea < 0
      ) {
        Alert.alert(
          "Invalid area",
          "Total area must be a valid number greater than or equal to zero."
        );
        return;
      }

      totalAreaHectares = parsedArea;
    }

    try {
      setIsCreating(true);
      setError(null);

      const farm = await createFarm({
        organizationId: organization.id,
        createdBy: user.id,
        name: trimmedName,
        country: trimmedCountry,
        region,
        municipality,
        totalAreaHectares,
        description,
      });

      setFarms((current) => [
        farm,
        ...current.filter(
          (item) => item.id !== farm.id
        ),
      ]);

      resetForm();

      Alert.alert(
        "Farm created",
        `${farm.name} was added successfully.`
      );
    } catch (createError) {
      console.warn(
        "[farms] Could not create farm:",
        createError
      );

      const message =
        createError instanceof Error
          ? createError.message
          : "Could not create farm.";

      setError(message);

      Alert.alert(
        "Could not create farm",
        message
      );
    } finally {
      setIsCreating(false);
    }
  };

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
              Dashboard
            </Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>
              FARM MANAGEMENT
            </Text>

            <Text style={styles.title}>
              Farms
            </Text>

            <Text style={styles.subtitle}>
              Manage agricultural properties for{" "}
              {organization?.name ?? "your organization"}.
            </Text>
          </View>

          <View style={styles.organizationBadge}>
            <Ionicons
              name="business-outline"
              size={18}
              color={colors.brand.primaryDark}
            />

            <Text style={styles.organizationText}>
              {organization?.name ?? "Organization"}
            </Text>
          </View>
        </View>

        {canManageFarms ? (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIcon}>
                <Ionicons
                  name="add"
                  size={22}
                  color={colors.brand.primary}
                />
              </View>

              <View style={styles.formHeaderCopy}>
                <Text style={styles.formTitle}>
                  Add Farm
                </Text>

                <Text style={styles.formSubtitle}>
                  Register an agricultural property
                  under this organization.
                </Text>
              </View>
            </View>

            <View style={styles.formGrid}>
              <View style={styles.field}>
                <Text style={styles.label}>
                  Farm name *
                </Text>

                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Example: Finca El Paraíso"
                  placeholderTextColor={
                    colors.light.textSecondary
                  }
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Country *
                </Text>

                <TextInput
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Example: El Salvador"
                  placeholderTextColor={
                    colors.light.textSecondary
                  }
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Region / Department
                </Text>

                <TextInput
                  value={region}
                  onChangeText={setRegion}
                  placeholder="Example: Santa Ana"
                  placeholderTextColor={
                    colors.light.textSecondary
                  }
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Municipality
                </Text>

                <TextInput
                  value={municipality}
                  onChangeText={setMunicipality}
                  placeholder="Example: Chalchuapa"
                  placeholderTextColor={
                    colors.light.textSecondary
                  }
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Total area (hectares)
                </Text>

                <TextInput
                  value={area}
                  onChangeText={setArea}
                  placeholder="Example: 25.5"
                  placeholderTextColor={
                    colors.light.textSecondary
                  }
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Description
                </Text>

                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional farm details"
                  placeholderTextColor={
                    colors.light.textSecondary
                  }
                  multiline
                  style={[
                    styles.input,
                    styles.textArea,
                  ]}
                />
              </View>
            </View>

            <Pressable
              style={[
                styles.createButton,
                isCreating &&
                  styles.createButtonDisabled,
              ]}
              disabled={isCreating}
              onPress={() => {
                void handleCreateFarm();
              }}
            >
              {isCreating ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={styles.createButtonText}
                  >
                    Create Farm
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Registered Farms
            </Text>

            <Text style={styles.sectionSubtitle}>
              {farms.length}{" "}
              {farms.length === 1
                ? "farm"
                : "farms"}{" "}
              in this organization
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={() => {
              void loadFarms();
            }}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={colors.brand.primary}
            />

            <Text style={styles.refreshText}>
              Refresh
            </Text>
          </Pressable>
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
              Loading farms...
            </Text>
          </View>
        ) : (
          <View style={styles.farmList}>
            {farms.map((farm) => (
              <View
                key={farm.id}
                style={styles.farmCard}
              >
                <View style={styles.farmIcon}>
                  <Ionicons
                    name="leaf-outline"
                    size={22}
                    color={colors.brand.primary}
                  />
                </View>

                <View style={styles.farmInfo}>
                  <View style={styles.farmTitleRow}>
                    <Text style={styles.farmName}>
                      {farm.name}
                    </Text>

                    <View
                      style={[
                        styles.statusBadge,
                        !farm.is_active &&
                          styles.inactiveBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          !farm.is_active &&
                            styles.inactiveText,
                        ]}
                      >
                        {farm.is_active
                          ? "Active"
                          : "Inactive"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.farmLocation}>
                    {[
                      farm.municipality,
                      farm.region,
                      farm.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>

                  {farm.total_area_hectares !==
                  null ? (
                    <Text style={styles.farmMeta}>
                      {farm.total_area_hectares} ha
                    </Text>
                  ) : null}

                  {farm.description ? (
                    <Text
                      style={styles.farmDescription}
                    >
                      {farm.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}

            {farms.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="leaf-outline"
                  size={34}
                  color={colors.light.textSecondary}
                />

                <Text style={styles.emptyTitle}>
                  No farms yet
                </Text>

                <Text style={styles.emptyText}>
                  Register the first farm for this
                  organization to begin building the
                  agricultural traceability structure.
                </Text>
              </View>
            ) : null}
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

  organizationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },

  organizationText: {
    color: colors.brand.primaryDark,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  formCard: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  formIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.brand.primaryLight,
  },

  formHeaderCopy: {
    flex: 1,
  },

  formTitle: {
    color: colors.light.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  formSubtitle: {
    marginTop: spacing.xs,
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
  },

  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  field: {
    flex: 1,
    minWidth: 260,
  },

  label: {
    marginBottom: spacing.xs,
    color: colors.light.text,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  input: {
    minHeight: 48,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.light.text,
    fontSize: typography.size.md,
  },

  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  createButton: {
    alignSelf: "flex-start",
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    color: "#FFFFFF",
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  sectionTitle: {
    color: colors.light.text,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },

  sectionSubtitle: {
    marginTop: spacing.xs,
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
  },

  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  refreshText: {
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
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

  farmList: {
    gap: spacing.sm,
  },

  farmCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  farmIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.brand.primaryLight,
  },

  farmInfo: {
    flex: 1,
  },

  farmTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },

  farmName: {
    color: colors.light.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },

  farmLocation: {
    marginTop: spacing.xs,
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
  },

  farmMeta: {
    marginTop: spacing.xs,
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  farmDescription: {
    marginTop: spacing.sm,
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
    lineHeight: 20,
  },

  statusBadge: {
    backgroundColor: colors.brand.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },

  statusText: {
    color: colors.brand.primaryDark,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },

  inactiveBadge: {
    backgroundColor: colors.light.background,
  },

  inactiveText: {
    color: colors.light.textSecondary,
  },

  emptyCard: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
  },

  emptyTitle: {
    marginTop: spacing.md,
    color: colors.light.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },

  emptyText: {
    marginTop: spacing.xs,
    maxWidth: 520,
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
    lineHeight: 20,
    textAlign: "center",
  },
});
