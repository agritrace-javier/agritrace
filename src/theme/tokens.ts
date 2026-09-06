export const colors = {
  brand: {
    primary: "#1F6B45",
    primaryDark: "#164D33",
    primaryLight: "#E8F3ED",
    accent: "#C89B3C",
  },

  light: {
    background: "#F6F8F7",
    surface: "#FFFFFF",
    surfaceSecondary: "#EEF2F0",
    text: "#17211B",
    textSecondary: "#66736B",
    border: "#DDE5E0",
    success: "#238636",
    warning: "#B7791F",
    error: "#C53030",
  },

  dark: {
    background: "#0D1410",
    surface: "#152019",
    surfaceSecondary: "#1C2A21",
    text: "#F4F7F5",
    textSecondary: "#A8B5AD",
    border: "#2B3A30",
    success: "#4CAF68",
    warning: "#E5B94C",
    error: "#EF6A6A",
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 36,
  },

  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extraBold: "800",
  },
} as const;

export const layout = {
  maxContentWidth: 1200,
  screenPadding: 20,
} as const;

export const tokens = {
  colors,
  spacing,
  radius,
  typography,
  layout,
} as const;

export type AppTokens = typeof tokens;
