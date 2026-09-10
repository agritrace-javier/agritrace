import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLots } from "../../../app/lots-store";
import { StatCard } from "../../components/StatCard";
import {
  colors,
  layout,
  radius,
  spacing,
  typography,
} from "../../theme/tokens";

export function Dashboard() {
  const { lots } = useLots();

  const recentLots = [...lots]
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 4);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>AGRITRACE</Text>
            <Text style={styles.title}>Agricultural Traceability</Text>
            <Text style={styles.subtitle}>
              Track lots, verify origin and follow the product journey.
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>System Online</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <StatCard
            label="Total Lots"
            value={lots.length}
            helper="Registered lots"
            icon={
              <Ionicons
                name="cube-outline"
                size={22}
                color={colors.brand.primary}
              />
            }
          />

          <StatCard
            label="Traceability"
            value="Active"
            helper="QR verification ready"
            icon={
              <Ionicons
                name="git-network-outline"
                size={22}
                color={colors.brand.primary}
              />
            }
          />

          <StatCard
            label="Verification"
            value="SHA-256"
            helper="Integrity layer"
            icon={
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={colors.brand.primary}
              />
            }
          />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.sectionSubtitle}>
              Common traceability operations
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.primaryAction}
            onPress={() => router.push("/scan")}
          >
            <Ionicons name="qr-code-outline" size={28} color="#FFFFFF" />

            <View style={styles.actionText}>
              <Text style={styles.primaryActionTitle}>Scan QR</Text>
              <Text style={styles.primaryActionSubtitle}>
                Verify a product or lot
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.secondaryAction}
            onPress={() => router.push("/catalog")}
          >
            <Ionicons
              name="layers-outline"
              size={28}
              color={colors.brand.primary}
            />

            <View style={styles.actionText}>
              <Text style={styles.secondaryActionTitle}>View Lots</Text>
              <Text style={styles.secondaryActionSubtitle}>
                Explore registered lots
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.secondaryAction}
            onPress={() => router.push("/create-lot")}
          >
            <Ionicons
              name="add-circle-outline"
              size={28}
              color={colors.brand.primary}
            />

            <View style={styles.actionText}>
              <Text style={styles.secondaryActionTitle}>Create Lot</Text>
              <Text style={styles.secondaryActionSubtitle}>
                Register agricultural product
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Lots</Text>
            <Text style={styles.sectionSubtitle}>
              Latest agricultural records
            </Text>
          </View>

          <Pressable onPress={() => router.push("/catalog")}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.lotList}>
          {recentLots.map((lot) => (
            <Pressable
              key={lot.id}
              style={styles.lotCard}
              onPress={() =>
                router.push({
                  pathname: "/lot/[id]",
                  params: { id: lot.id },
                })
              }
            >
              <View style={styles.lotIcon}>
                <Ionicons
                  name="leaf-outline"
                  size={22}
                  color={colors.brand.primary}
                />
              </View>

              <View style={styles.lotInfo}>
                <Text style={styles.lotProduct}>
                  {lot.product_en || lot.product_es}
                </Text>

                <Text style={styles.lotMeta}>
                  {lot.id} · {lot.origin}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.light.textSecondary}
              />
            </Pressable>
          ))}

          {recentLots.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="leaf-outline"
                size={32}
                color={colors.light.textSecondary}
              />
              <Text style={styles.emptyTitle}>No lots yet</Text>
              <Text style={styles.emptyText}>
                Create your first agricultural lot to begin traceability.
              </Text>
            </View>
          ) : null}
        </View>
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

  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.xl,
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

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.light.success,
  },

  statusText: {
    color: colors.brand.primaryDark,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
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

  viewAll: {
    color: colors.brand.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },

  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  primaryAction: {
    flex: 1,
    minWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },

  secondaryAction: {
    flex: 1,
    minWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },

  actionText: {
    flex: 1,
  },

  primaryActionTitle: {
    color: "#FFFFFF",
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },

  primaryActionSubtitle: {
    marginTop: spacing.xs,
    color: "#E8F3ED",
    fontSize: typography.size.sm,
  },

  secondaryActionTitle: {
    color: colors.light.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
  },

  secondaryActionSubtitle: {
    marginTop: spacing.xs,
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
  },

  lotList: {
    gap: spacing.sm,
  },

  lotCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  lotIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand.primaryLight,
  },

  lotInfo: {
    flex: 1,
  },

  lotProduct: {
    color: colors.light.text,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },

  lotMeta: {
    marginTop: spacing.xs,
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
  },

  empty: {
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
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
    textAlign: "center",
  },
});
