import { useUser } from "@clerk/expo";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandMark } from "../components/BrandMark";
import { SignOutButton } from "../components/SignOutButton";
import { colors, radius, spacing, typography } from "../theme/tokens";

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[
      styles.content,
      { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
    ]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Welcome, {user?.firstName || "Rider"}</Text>
        <BrandMark size={40} />
      </View>
      <Text style={styles.subtitle}>Your ride, connected.</Text>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>Rides are coming</Text>
        <Text style={styles.body}>Communities and rides are still being built. Your ride list is not available yet.</Text>
      </View>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.heading}>Location sharing</Text>
        <Text style={styles.body}>This screen does not track or share your location. When tracking is available, sharing will require joining an active ride and enabling tracking.</Text>
      </View>
      <SignOutButton />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  title: { ...typography.heading2, color: colors.text, flex: 1 },
  subtitle: { ...typography.body, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  heading: { ...typography.heading3, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
});
