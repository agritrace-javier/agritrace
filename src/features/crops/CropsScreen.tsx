import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../auth";
import { getFieldById } from "../fields/fieldsService";
import type { Field } from "../fields/fieldsService";
import {
  colors,
  layout,
  radius,
  spacing,
  typography,
} from "../../theme/tokens";
import { CreateCropTypeForm } from "./CreateCropTypeForm";
import { getCropTypesByOrganization } from "./cropTypesService";
import type { CropType } from "./cropTypesService";
import { CreatePlantingForm } from "./CreatePlantingForm";
import { getPlantingsByField, setPlantingActive } from "./plantingsService";
import type { Planting } from "./plantingsService";

type CropsData = {
  scope: string;
  field: Field;
  cropTypes: CropType[];
  plantings: Planting[];
};

type LoadError = {
  scope: string;
  message: string;
};

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Could not load crops.";
}

export function CropsScreen() {
  const params = useLocalSearchParams<{
    fieldId?: string | string[];
  }>();

  const fieldId =
    typeof params.fieldId === "string" ? params.fieldId : null;

  const { user, organization, hasActiveMembership, can } = useAuth();
  const organizationId = organization?.id;
  const userId = user?.id;

  const scope =
    organizationId && userId && fieldId && hasActiveMembership
      ? `${userId}:${organizationId}:${fieldId}`
      : null;

  const [data, setData] = useState<CropsData | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [editingSelection, setEditingSelection] = useState<{
    scope: string;
    id: string;
  } | null>(null);
  const [savingScope, setSavingScope] = useState<string | null>(null);
  const savingRef = useRef<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{
    scope: string;
    id: string;
  } | null>(null);
  const statusUpdateRef = useRef<{
    scope: string;
    id: string;
  } | null>(null);
  const [actionError, setActionError] = useState<LoadError | null>(null);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  useEffect(() => {
    if (!scope || !organizationId || !fieldId) {
      return;
    }

    let cancelled = false;

    setData(null);
    setLoadError(null);

    async function load() {
      try {
        const field = await getFieldById(fieldId!);

        if (!field || field.organization_id !== organizationId) {
          throw new Error("This field is unavailable in your organization.");
        }

        const [cropTypes, plantings] = await Promise.all([
          getCropTypesByOrganization(organizationId!),
          getPlantingsByField(organizationId!, field.id),
        ]);

        if (!cancelled) {
          setData({
            scope: scope!,
            field,
            cropTypes,
            plantings,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError({
            scope: scope!,
            message: getErrorMessage(error),
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [scope, organizationId, fieldId]);

  const currentData = data?.scope === scope ? data : null;
  const currentError =
    loadError?.scope === scope ? loadError.message : null;

  const editingPlanting =
    editingSelection?.scope === scope
      ? currentData?.plantings.find(
          (item) => item.id === editingSelection.id
        ) ?? null
      : null;

  const isPlantingSaving = scope !== null && savingScope === scope;
  const canManagePlantings = hasActiveMembership && can("farms.manage");
  const isUpdatingPlanting =
    scope !== null && statusUpdate?.scope === scope;
  const currentActionError =
    actionError?.scope === scope ? actionError.message : null;

  async function handleToggleActive(planting: Planting) {
    if (
      !scope ||
      !canManagePlantings ||
      !currentData ||
      editingPlanting !== null ||
      savingRef.current === scope ||
      statusUpdateRef.current?.scope === scope ||
      planting.organization_id !== organizationId ||
      planting.field_id !== fieldId
    ) {
      return;
    }

    const request = { scope, id: planting.id };
    statusUpdateRef.current = request;
    setStatusUpdate(request);
    setActionError(null);

    try {
      const updated = await setPlantingActive(
        planting.organization_id,
        planting.id,
        !planting.is_active
      );

      if (scopeRef.current !== request.scope) {
        return;
      }

      setData((current) => {
        if (!current || current.scope !== request.scope) {
          return current;
        }

        return {
          ...current,
          plantings: current.plantings.map((item) =>
            item.id === updated.id ? updated : item
          ),
        };
      });
    } catch (error) {
      if (scopeRef.current === request.scope) {
        setActionError({
          scope: request.scope,
          message:
            error instanceof Error
              ? error.message
              : "Could not update planting status. Please try again.",
        });
      }
    } finally {
      if (statusUpdateRef.current === request) {
        statusUpdateRef.current = null;
        setStatusUpdate(null);
      }
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.container}>
        <Text style={styles.eyebrow}>CROP MANAGEMENT</Text>
        <Text style={styles.title}>Crops</Text>
        <Text style={styles.subtitle}>
          Crop types, plantings and growing cycles within a field.
        </Text>

        {!scope ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              An active organization membership and a valid field are required.
            </Text>
          </View>
        ) : currentError ? (
          <View style={styles.card}>
            <Text accessibilityRole="alert" style={styles.error}>
              {currentError}
            </Text>
          </View>
        ) : !currentData ? (
          <View style={styles.card}>
            <ActivityIndicator size="large" />
            <Text style={styles.body}>Loading crops...</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.heading}>{currentData.field.name}</Text>
              <Text style={styles.body}>
                Field status: {currentData.field.is_active ? "Active" : "Inactive"}
              </Text>
              <Text style={styles.body}>
                Organization crop types: {currentData.cropTypes.length}
              </Text>
            </View>

            <CreateCropTypeForm
              key={currentData.scope}
              organizationId={currentData.field.organization_id}
              onCreated={(cropType) => {
                setData((current) => {
                  if (
                    !current ||
                    current.scope !== currentData.scope ||
                    cropType.organization_id !== current.field.organization_id
                  ) {
                    return current;
                  }

                  return {
                    ...current,
                    cropTypes: [
                      ...current.cropTypes.filter(
                        (item) => item.id !== cropType.id
                      ),
                      cropType,
                    ].sort((a, b) => a.name.localeCompare(b.name)),
                  };
                });
              }}
            />

            <CreatePlantingForm
              key={`planting:${currentData.scope}:${editingPlanting?.id ?? "new"}`}
              organizationId={currentData.field.organization_id}
              fieldId={currentData.field.id}
              cropTypes={currentData.cropTypes}
              planting={editingPlanting}
              disabled={isUpdatingPlanting}
              onCancel={() => setEditingSelection(null)}
              onSavingChange={(saving) => {
                if (scopeRef.current !== currentData.scope) {
                  return;
                }

                savingRef.current = saving ? currentData.scope : null;
                setSavingScope(saving ? currentData.scope : null);
              }}
              onCreated={(planting) => {
                setData((current) => {
                  if (
                    !current ||
                    current.scope !== currentData.scope ||
                    planting.organization_id !== current.field.organization_id ||
                    planting.field_id !== current.field.id
                  ) {
                    return current;
                  }

                  return {
                    ...current,
                    plantings: [
                      ...current.plantings.filter(
                        (item) => item.id !== planting.id
                      ),
                      planting,
                    ],
                  };
                });
              }}
            />

            {currentActionError ? (
              <View style={styles.card}>
                <Text accessibilityRole="alert" style={styles.error}>
                  {currentActionError}
                </Text>
              </View>
            ) : null}

            <Text style={styles.heading}>
              Registered Plantings ({currentData.plantings.length})
            </Text>

            {currentData.plantings.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.heading}>No plantings yet</Text>
                <Text style={styles.body}>
                  No plantings or growing cycles have been registered
                  for this field.
                </Text>
              </View>
            ) : (
              currentData.plantings.map((planting) => {
                const cropType = currentData.cropTypes.find(
                  (item) => item.id === planting.crop_type_id
                );

                return (
                  <View key={planting.id} style={styles.card}>
                    <Text style={styles.heading}>{planting.name}</Text>
                    {canManagePlantings ? (
                      <Pressable
                        onPress={() => {
                          if (
                            savingRef.current === currentData.scope ||
                            statusUpdateRef.current?.scope === currentData.scope ||
                            planting.organization_id !== organizationId ||
                            planting.field_id !== fieldId
                          ) {
                            return;
                          }

                          setEditingSelection({
                            scope: currentData.scope,
                            id: planting.id,
                          });
                        }}
                        disabled={isPlantingSaving || isUpdatingPlanting || editingPlanting !== null}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${planting.name}`}
                        style={{
                          minHeight: 48,
                          alignSelf: "flex-start",
                          justifyContent: "center",
                          paddingHorizontal: spacing.md,
                          borderWidth: 1,
                          borderColor: colors.brand.primary,
                          borderRadius: radius.md,
                          opacity:
                            isPlantingSaving || isUpdatingPlanting || editingPlanting !== null
                              ? 0.6
                              : 1,
                        }}
                      >
                        <Text style={{ color: colors.brand.primary }}>
                          {editingPlanting?.id === planting.id
                            ? "Editing..."
                            : "Edit"}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Text style={styles.body}>
                      Crop: {cropType?.name ?? "Unavailable"}
                    </Text>
                    {planting.variety ? (
                      <Text style={styles.body}>
                        Variety: {planting.variety}
                      </Text>
                    ) : null}
                    <Text style={styles.body}>
                      Growing method: {planting.growing_method === "perennial"
                        ? "Perennial"
                        : "Growing cycle"}
                    </Text>
                    <Text style={styles.body}>
                      Status: {planting.is_active ? "Active" : "Inactive"}
                    </Text>
                    {canManagePlantings ? (
                      <Pressable
                        onPress={() => void handleToggleActive(planting)}
                        disabled={
                          isPlantingSaving ||
                          isUpdatingPlanting ||
                          editingPlanting !== null
                        }
                        accessibilityRole="button"
                        accessibilityLabel={
                          `${planting.is_active ? "Deactivate" : "Activate"} ${planting.name}`
                        }
                        style={{
                          minHeight: 48,
                          alignSelf: "flex-start",
                          justifyContent: "center",
                          paddingHorizontal: spacing.md,
                          borderWidth: 1,
                          borderColor: colors.light.border,
                          borderRadius: radius.md,
                          opacity:
                            isPlantingSaving ||
                            isUpdatingPlanting ||
                            editingPlanting !== null
                              ? 0.6
                              : 1,
                        }}
                      >
                        <Text style={styles.body}>
                          {isUpdatingPlanting && statusUpdate?.id === planting.id
                            ? "Updating..."
                            : planting.is_active
                              ? "Deactivate"
                              : "Activate"}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => {
                        if (
                          !hasActiveMembership ||
                          savingRef.current === currentData.scope ||
                          statusUpdateRef.current?.scope === currentData.scope ||
                          editingPlanting !== null ||
                          planting.organization_id !== organizationId ||
                          planting.field_id !== fieldId
                        ) {
                          return;
                        }

                        router.push({
                          pathname: "/harvests",
                          params: { plantingId: planting.id },
                        });
                      }}
                      disabled={
                        !hasActiveMembership ||
                        isPlantingSaving ||
                        isUpdatingPlanting ||
                        editingPlanting !== null
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`View harvests for ${planting.name}`}
                      style={{
                        minHeight: 48,
                        alignSelf: "flex-start",
                        justifyContent: "center",
                        paddingHorizontal: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.brand.primary,
                        borderRadius: radius.md,
                        opacity:
                          !hasActiveMembership ||
                          isPlantingSaving ||
                          isUpdatingPlanting ||
                          editingPlanting !== null
                            ? 0.6
                            : 1,
                      }}
                    >
                      <Text style={{ color: colors.brand.primary }}>
                        View Harvests
                      </Text>
                    </Pressable>
                    {planting.established_on ? (
                      <Text style={styles.body}>
                        Established: {planting.established_on}
                      </Text>
                    ) : null}
                    {planting.ended_on ? (
                      <Text style={styles.body}>
                        Ended: {planting.ended_on}
                      </Text>
                    ) : null}
                    {planting.notes ? (
                      <Text style={styles.body}>{planting.notes}</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </>
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
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  container: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.brand.primary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 2,
  },
  title: {
    color: colors.light.text,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.extraBold,
  },
  subtitle: {
    color: colors.light.textSecondary,
    fontSize: typography.size.md,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
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
  error: {
    color: colors.light.error,
    fontSize: typography.size.md,
  },
});
