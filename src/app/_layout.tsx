import { useFonts } from "expo-font";
import { Inter_300Light } from "@expo-google-fonts/inter/300Light";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { ClerkProvider, useAuth, useSession } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors, typography } from "../theme/tokens";

import { SignOutButton } from "../components/SignOutButton";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error("Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env, then restart Expo.");
}

function AuthNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();

  if (!isLoaded) {
    return <View style={styles.centered}><ActivityIndicator accessibilityLabel="Loading your session" color={colors.brand} /></View>;
  }

  if (session?.status === "pending" || session?.currentTask) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>One more step is needed</Text>
        <Text style={styles.message}>Your account requires additional setup. Please contact Groupify support to continue.</Text>
        <SignOutButton />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen name="home" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light, Inter_400Regular, Inter_500Medium,
    Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });

  if (fontError) {
    return <View style={styles.centered}><Text accessibilityRole="alert">Unable to load app fonts. Please restart Groupify.</Text></View>;
  }
  if (!fontsLoaded) {
    return <View style={styles.centered}><ActivityIndicator accessibilityLabel="Loading Groupify" color={colors.brand} /></View>;
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <AuthNavigator />
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background, padding: 24 },
  title: { ...typography.heading2, color: colors.text },
  message: { marginTop: 12, maxWidth: 350, textAlign: "center", color: colors.textMuted, ...typography.body },
});
