/** Groupify's approved light-theme design tokens. */
export const colors = {
  brand: "#2563FF",
  onBrand: "#FFFFFF",
  text: "#0F172A",
  textMuted: "#475569",
  background: "#F1F5F9",
  surface: "#FFFFFF",
  border: "#CBD5E1",
  successText: "#166534",
  successBackground: "#DCFCE7",
  warningText: "#92400E",
  warningBackground: "#FEF3C7",
  dangerText: "#B91C1C",
  dangerBackground: "#FEE2E2",
  infoText: "#075985",
  infoBackground: "#E0F2FE",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
} as const;

export const typography = {
  family: "Inter",
  heading1: { fontSize: 32, lineHeight: 40, fontWeight: "700" },
  heading2: { fontSize: 24, lineHeight: 32, fontWeight: "600" },
  heading3: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
} as const;
