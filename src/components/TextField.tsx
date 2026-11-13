import { useState, type Ref, type ComponentRef } from "react";
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "../theme/tokens";

type TextFieldProps = Omit<TextInputProps, "accessibilityLabel"> & {
  label: string;
  hideLabel?: boolean;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

/** Callers own values, validation and request state; refs point to the native input. */
export function TextField({ label, hideLabel = false, error, containerStyle, style, editable = true, onFocus, onBlur, accessibilityState, accessibilityHint, ref, ...props }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {!hideLabel ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...props}
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error || accessibilityHint}
        accessibilityState={{ ...accessibilityState, disabled: !editable }}
        editable={editable}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style, !editable && styles.disabled, focused && editable && styles.focused, !!error && styles.invalid]}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
      />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minWidth: 0, gap: spacing.sm },
  label: { ...typography.bodySmall, color: colors.text },
  input: { ...typography.body, color: colors.text, backgroundColor: colors.surface, borderColor: colors.textMuted, borderWidth: 1, borderRadius: radius.lg, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  focused: { borderColor: colors.brand },
  invalid: { borderColor: colors.dangerText },
  disabled: { backgroundColor: colors.background },
  error: { ...typography.bodySmall, color: colors.dangerText },
});
