import type { ComponentProps } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { colors, spacing } from "../theme/tokens";
import { StateNotice } from "./StateNotice";

/** Requires SafeAreaProvider, including during pre-font startup. */
export function StateScreen(props: ComponentProps<typeof StateNotice>) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[
      styles.content,
      { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
    ]}>
      <StatusBar style="dark" />
      <StateNotice {...props} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl },
});
