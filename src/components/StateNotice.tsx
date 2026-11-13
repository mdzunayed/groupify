import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../theme/tokens";

type StateNoticeProps = {
  title: string;
  message: string;
  kind?: "info" | "loading" | "error";
  fontsReady?: boolean;
  children?: ReactNode;
};

/** Present evidence supplied by the caller; never infer connectivity or data state. */
export function StateNotice({ title, message, kind = "info", fontsReady = true, children }: StateNoticeProps) {
  return (
    <View style={styles.card}>
      {kind === "loading" ? <ActivityIndicator accessible={false} color={colors.brand} /> : null}
      <Text accessibilityRole="header" style={[styles.title, fontsReady && styles.titleFont]}>{title}</Text>
      <Text
        accessibilityRole={kind === "error" ? "alert" : undefined}
        aria-busy={kind === "loading"}
        style={[styles.message, fontsReady && styles.bodyFont, kind === "error" && styles.error]}
      >{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  title: { fontSize: typography.heading3.fontSize, lineHeight: typography.heading3.lineHeight, color: colors.text },
  message: { fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight, color: colors.textMuted },
  titleFont: { fontFamily: typography.heading3.fontFamily },
  bodyFont: { fontFamily: typography.body.fontFamily },
  error: { color: colors.dangerText },
});
