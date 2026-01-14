// app/theme.ts
export type ThemeName = "light" | "dark";

export function getTheme(theme: ThemeName) {
  const isDark = theme === "dark";

  return Object.freeze({
    isDark,
    colors: {
      green: "#2E7D32",

      // ✅ Added for status badges (Catalog / Lot detail)
      yellow: isDark ? "#FBBF24" : "#B45309",
      red: isDark ? "#EF4444" : "#B91C1C",
      dangerBg: isDark ? "#2A1111" : "#FEE2E2",

      bg: isDark ? "#0B1220" : "#F3F5F7",
      card: isDark ? "#111827" : "#FFFFFF",
      text: isDark ? "#E5E7EB" : "#0F172A",
      muted: isDark ? "#94A3B8" : "#64748B",
      border: isDark ? "#1F2937" : "#E2E8F0",
      segmentBg: isDark ? "#0F172A" : "#F1F5F9",
      primaryBtn: isDark ? "#FFFFFF" : "#0B1220",
      primaryBtnText: isDark ? "#0B1220" : "#FFFFFF",
    },
  });
}
