import { useClerk } from "@clerk/expo";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "./Button";

import { colors, spacing, typography } from "../theme/tokens";

import { getAuthError } from "../lib/phone-auth";

export function SignOutButton() {
  const { signOut } = useClerk();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function handleSignOut() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await signOut();
      // The protected stack redirects only after Clerk clears the session.
    } catch (cause) {
      setError(getAuthError(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Button label="Sign out" loadingLabel="Signing out…" loading={busy} onPress={handleSignOut} variant="text" />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", marginTop: spacing.xl, gap: spacing.sm },
  error: { ...typography.bodySmall, color: colors.dangerText, textAlign: "center" },
});
