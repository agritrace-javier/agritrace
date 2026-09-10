import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../theme/tokens";

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  helper?: string;
};

export function StatCard({
  label,
  value,
  icon,
  helper,
}: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>

        {icon ? <View style={styles.icon}>{icon}</View> : null}
      </View>

      <Text style={styles.value}>{value}</Text>

      {helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  label: {
    color: colors.light.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },

  icon: {
    alignItems: "center",
    justifyContent: "center",
  },

  value: {
    marginTop: spacing.sm,
    color: colors.light.text,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },

  helper: {
    marginTop: spacing.xs,
    color: colors.light.textSecondary,
    fontSize: typography.size.xs,
  },
});
