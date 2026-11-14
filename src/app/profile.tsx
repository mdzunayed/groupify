import { useAuth } from "@clerk/expo";
import { fetch as expoFetch } from "expo/fetch";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../components/Button";
import { StateNotice } from "../components/StateNotice";
import { StateScreen } from "../components/StateScreen";
import { TextField } from "../components/TextField";
import { createProfileApi, ProfileApiError, type ProfileRecord, type RiderType } from "../lib/profile-api";
import { colors, radius, spacing, typography } from "../theme/tokens";

export default function Profile() {
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();
  const router = useRouter();
  if (!isLoaded || !isSignedIn || !userId || !sessionId) {
    return <StateScreen title="Rider details unavailable" message="Return home and check your sign-in status.">
      <Button label="Back to home" variant="text" onPress={() => router.replace("/home")} />
    </StateScreen>;
  }
  // A different account or session must never inherit another rider's draft or requests.
  return <ProfileEditor key={`${userId}:${sessionId}`} getToken={getToken} />;
}

function ProfileEditor({ getToken }: { getToken: () => Promise<string | null> }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [opened, setOpened] = useState(false);
  const [record, setRecord] = useState<ProfileRecord | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [riderType, setRiderType] = useState<RiderType | null>(null);
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [busy, setBusy] = useState<"open" | "save" | null>(null);
  const [reloadRequired, setReloadRequired] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; error?: boolean } | null>(null);
  const pending = useRef(false);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; controller.current?.abort(); };
  }, []);

  let api: ReturnType<typeof createProfileApi> | null = null;
  try {
    api = createProfileApi({ baseUrl: process.env.EXPO_PUBLIC_GROUPIFY_API_URL, getToken, fetcher: expoFetch });
  } catch { /* No token or request is made until the explicit open action. */ }

  function apply(saved: ProfileRecord | null) {
    setRecord(saved);
    setDisplayName(saved?.profile.displayName ?? "");
    setRiderType(saved?.profile.riderType ?? null);
    setVehicleDescription(saved?.profile.vehicleDescription ?? "");
    setOpened(true);
    setReloadRequired(false);
  }

  function edited() { if (notice && !notice.error) setNotice(null); }

  async function request(operation: "open" | "save") {
    if (!api || pending.current || blocked || (operation === "save" && reloadRequired)) return;
    if (operation === "save" && (!displayName.trim() || !riderType)) {
      setNotice({ title: "Check your details", message: "Enter a display name and choose your riding type.", error: true });
      return;
    }
    pending.current = true;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(operation);
    setNotice(null);
    try {
      if (operation === "open") {
        if (!opened) await api.bootstrap(abort.signal);
        const saved = await api.get(abort.signal);
        if (active.current && !abort.signal.aborted) apply(saved);
      } else {
        const input = { displayName, riderType: riderType!, vehicleDescription };
        const saved = record ? await api.update(input, record, abort.signal) : await api.create(input, abort.signal);
        if (active.current && !abort.signal.aborted) {
          apply(saved);
          setNotice({ title: "Details saved", message: "Your text details have been saved." });
        }
      }
    } catch (error) {
      if (!active.current || abort.signal.aborted) return;
      const kind = error instanceof ProfileApiError ? error.kind : "unavailable";
      if (kind === "authentication" || kind === "forbidden") {
        apply(null);
        setOpened(false);
        setBlocked(true);
        setNotice({ title: "Rider details unavailable", message: "Your account cannot access rider details. Return home and check your sign-in status.", error: true });
      } else if (operation === "save" && kind !== "invalid") {
        setReloadRequired(true);
        setNotice({ title: kind === "conflict" ? "Your saved details changed" : "Save could not be confirmed",
          message: "Your text is still here. Reload saved details before saving again. Reload replaces your unsaved text with the latest saved details.", error: true });
      } else {
        setNotice({ title: kind === "invalid" ? "Check your details" : "Could not open rider details",
          message: kind === "invalid" ? "Use a name of up to 80 characters and vehicle details of up to 160 characters, without control characters." : "Please try again when the service is available.", error: true });
      }
    } finally {
      if (active.current && !abort.signal.aborted) { pending.current = false; setBusy(null); }
    }
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled" contentContainerStyle={[
      styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
    ]}>
      <StatusBar style="dark" />
      <Text accessibilityRole="header" style={styles.title}>Rider details</Text>
      {!api ? <StateNotice title="Rider details unavailable" message="Rider details are not available in this build. Please try a configured development build." /> : <>
        <Text style={styles.body}>Edit your name, riding type and optional vehicle details.</Text>
        {notice ? <StateNotice {...notice} kind={notice.error ? "error" : "info"} /> : null}
        {!opened && !blocked ? <Button label="Open rider details" loadingLabel="Opening details…" loading={busy === "open"} onPress={() => { void request("open"); }} /> : null}
        {opened ? <>
          <TextField label="Display name" value={displayName} onChangeText={(value) => { setDisplayName(value); edited(); }} editable={!busy} autoCapitalize="words" accessibilityHint="Required. Up to 80 characters." />
          <View style={styles.choices}>
            <Text style={styles.label}>Riding type (required)</Text>
            {(["motorcycle", "bicycle"] as const).map((choice) => <Pressable key={choice} accessibilityRole="radio"
              accessibilityLabel={choice === "motorcycle" ? "Motorcycle" : "Bicycle"}
              accessibilityState={{ checked: riderType === choice, disabled: !!busy }} disabled={!!busy}
              onPress={() => { setRiderType(choice); edited(); }} style={[styles.choice, riderType === choice && styles.selected]}>
              <Text style={styles.body}>{riderType === choice ? "●" : "○"} {choice === "motorcycle" ? "Motorcycle" : "Bicycle"}</Text>
            </Pressable>)}
          </View>
          <TextField label="Vehicle details (optional)" value={vehicleDescription} onChangeText={(value) => { setVehicleDescription(value); edited(); }} editable={!busy} multiline accessibilityHint="Up to 160 characters. Leave blank to clear saved vehicle details." />
          <Text style={styles.body}>Profile pictures are not available yet. You can save these text details.</Text>
          <Button label="Save details" loadingLabel="Saving details…" loading={busy === "save"} disabled={!!busy || reloadRequired} onPress={() => { void request("save"); }} />
          {reloadRequired ? <Button label="Reload saved details" loadingLabel="Reloading details…" loading={busy === "open"} onPress={() => { void request("open"); }} /> : null}
        </> : null}
      </>}
      <Button label="Back to home" variant="text" onPress={() => router.replace("/home")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  title: { ...typography.heading2, color: colors.text },
  body: { ...typography.body, color: colors.text },
  label: { ...typography.bodySmall, color: colors.text },
  choices: { gap: spacing.sm },
  choice: { minHeight: 48, padding: spacing.md, borderWidth: 1, borderColor: colors.textMuted, borderRadius: radius.lg, backgroundColor: colors.surface },
  selected: { borderColor: colors.brand, borderWidth: 2 },
});
