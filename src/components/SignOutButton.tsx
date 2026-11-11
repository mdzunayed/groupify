import { useClerk } from "@clerk/expo";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
      <Pressable accessibilityRole="button" disabled={busy} onPress={handleSignOut} style={styles.button}>
        <Text style={styles.label}>{busy ? "Signing out…" : "Sign out"}</Text>
      </Pressable>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", marginTop: 22 },
  button: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  label: { color: "#2563FF", fontSize: 14, fontWeight: "700" },
  error: { color: "#D43B46", fontSize: 13, textAlign: "center" },
});
