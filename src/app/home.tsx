import { useUser } from "@clerk/expo";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/Button";
import { SignOutButton } from "../components/SignOutButton";
import { StateNotice } from "../components/StateNotice";
import { colors, spacing, typography } from "../theme/tokens";

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const router = useRouter();

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
      <Button label="Rider details" onPress={() => router.push("/profile")} />
      <StateNotice title="Rides are coming" message="Communities and rides are still being built. Your ride list is not available yet." />
      <StateNotice title="Location sharing" message="This screen does not track or share your location. When tracking is available, sharing will require joining an active ride and enabling tracking." />
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
});
