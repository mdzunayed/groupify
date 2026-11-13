import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "../theme/tokens";

type ButtonProps = {
  label: string;
  loadingLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "text";
  style?: StyleProp<ViewStyle>;
};

/** Loading also disables interaction. Request deduplication belongs to the caller. */
export function Button({ label, loadingLabel, onPress, disabled = false, loading = false, variant = "primary", style }: ButtonProps) {
  const unavailable = disabled || loading;
  const textVariant = variant === "text";
  const foreground = textVariant ? colors.brand : colors.onBrand;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading ? loadingLabel ?? label : label}
      aria-disabled={unavailable}
      aria-busy={loading}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [styles.button, textVariant ? styles.textButton : styles.primaryButton, style, unavailable && styles.disabled, pressed && styles.pressed]}
    >
      {loading ? <ActivityIndicator accessible={false} color={foreground} /> : null}
      <Text style={[styles.label, { color: foreground }]}>{loading ? loadingLabel ?? label : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm },
  primaryButton: { backgroundColor: colors.brand },
  textButton: { backgroundColor: colors.surface },
  label: { ...typography.body, fontFamily: "Inter_600SemiBold", textAlign: "center", flexShrink: 1 },
  disabled: { opacity: 0.6 },
  pressed: { transform: [{ scale: 0.98 }] },
});
