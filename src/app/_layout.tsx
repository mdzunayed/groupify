import { ClerkProvider, useAuth, useSession } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SignOutButton } from "../components/SignOutButton";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error("Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env, then restart Expo.");
}

function AuthNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();

  if (!isLoaded) {
    return <View style={styles.centered}><ActivityIndicator accessibilityLabel="Loading your session" color="#2563FF" /></View>;
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
  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <AuthNavigator />
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7FAFC", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#111923" },
  message: { marginTop: 12, maxWidth: 350, textAlign: "center", color: "#677383", lineHeight: 22 },
});
