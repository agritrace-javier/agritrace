import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../auth";
import { getPlantingById } from "../crops/plantingsService";
import type { Planting } from "../crops/plantingsService";
import {
  colors,
  layout,
  radius,
  spacing,
  typography,
} from "../../theme/tokens";
import { CreateHarvestForm } from "./CreateHarvestForm";
import { getHarvestsByPlanting } from "./harvestsService";
import type { Harvest } from "./harvestsService";

type HarvestsData = {
  scope: string;
  planting: Planting;
  harvests: Harvest[];
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

  return "Could not load harvests.";
}

export function HarvestsScreen() {
  const params = useLocalSearchParams<{
    plantingId?: string | string[];
  }>();

  const plantingId =
    typeof params.plantingId === "string" ? params.plantingId : null;

  const { user, organization, hasActiveMembership } = useAuth();
  const organizationId = organization?.id;
  const userId = user?.id;

  const scope =
    organizationId && userId && plantingId && hasActiveMembership
      ? `${userId}:${organizationId}:${plantingId}`
      : null;

  const [data, setData] = useState<HarvestsData | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);

  useEffect(() => {
    if (!scope || !organizationId || !plantingId) {
      return;
    }

    const requestScope = scope;
    const requestOrganizationId = organizationId;
    const requestPlantingId = plantingId;
    let cancelled = false;

    setData(null);
    setLoadError(null);

    async function load() {
      try {
        const planting = await getPlantingById(
          requestOrganizationId,
          requestPlantingId
        );

        if (
          !planting ||
          planting.organization_id !== requestOrganizationId
        ) {
          throw new Error(
            "This planting is unavailable in your organization."
          );
        }

        const harvests = await getHarvestsByPlanting(
          requestOrganizationId,
          planting.id
        );

        if (!cancelled) {
          setData({
            scope: requestScope,
            planting,
            harvests,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError({
            scope: requestScope,
            message: getErrorMessage(error),
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [scope, organizationId, plantingId]);

  const currentData = data?.scope === scope ? data : null;
  const currentError =
    loadError?.scope === scope ? loadError.message : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        {currentData ? (
          <Pressable
            onPress={() =>
              router.replace({
                pathname: "/crops",
                params: { fieldId: currentData.planting.field_id },
              })
            }
            accessibilityRole="button"
            style={styles.backButton}
          >
            <Text style={styles.backText}>Back to Crops</Text>
          </Pressable>
        ) : null}

        <Text style={styles.eyebrow}>HARVEST MANAGEMENT</Text>
        <Text style={styles.title}>Harvests</Text>
        <Text style={styles.body}>
          Harvest records collected from one planting or growing cycle.
        </Text>

        {!scope ? (
          <View style={styles.card}>
            <Text style={styles.body}>
              An active organization membership and a valid planting
              are required.
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
            <Text style={styles.body}>Loading harvests...</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.heading}>
                {currentData.planting.name}
              </Text>
              <Text style={styles.body}>
                Planting status: {currentData.planting.is_active
                  ? "Active"
                  : "Inactive"}
              </Text>
            </View>

            <CreateHarvestForm
              key={currentData.scope}
              organizationId={currentData.planting.organization_id}
              plantingId={currentData.planting.id}
              onCreated={(harvest) => {
                setData((current) => {
                  if (
                    !current ||
                    current.scope !== currentData.scope ||
                    harvest.organization_id !== current.planting.organization_id ||
                    harvest.planting_id !== current.planting.id
                  ) {
                    return current;
                  }

                  return {
                    ...current,
                    harvests: [
                      ...current.harvests.filter(
                        (item) => item.id !== harvest.id
                      ),
                      harvest,
                    ].sort(
                      (a, b) =>
                        b.harvest_date.localeCompare(a.harvest_date) ||
                        b.created_at.localeCompare(a.created_at) ||
                        a.id.localeCompare(b.id)
                    ),
                  };
                });
              }}
            />

            <Text style={styles.heading}>
              Registered Harvests ({currentData.harvests.length})
            </Text>

            {currentData.harvests.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.heading}>No harvests yet</Text>
                <Text style={styles.body}>
                  No harvests have been registered for this planting.
                </Text>
              </View>
            ) : (
              currentData.harvests.map((harvest) => (
                <View key={harvest.id} style={styles.card}>
                  <Text style={styles.heading}>{harvest.name}</Text>
                  <Text style={styles.body}>
                    Harvest date: {harvest.harvest_date}
                  </Text>
                  <Text style={styles.body}>
                    Quantity: {harvest.quantity} {harvest.unit}
                  </Text>
                  <Text style={styles.body}>
                    Status: {harvest.is_active ? "Active" : "Inactive"}
                  </Text>
                  {harvest.notes ? (
                    <Text style={styles.body}>{harvest.notes}</Text>
                  ) : null}
                </View>
              ))
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
  backButton: {
    minHeight: 48,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  backText: {
    color: colors.brand.primary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
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
