import { useSignIn, useSignUp } from "@clerk/expo";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../components/Button";
import { colors } from "../theme/tokens";

import { BrandMark } from "../components/BrandMark";
import { ReferenceBackdrop } from "../components/ReferenceBackdrop";
import {
  type AuthMode,
  type PhoneAuth,
  getAuthError,
  normalizePhoneNumber,
  RESEND_DELAY_MS,
  resendPhoneCode,
  sendPhoneCode,
  verifyPhoneCode,
} from "../lib/phone-auth";

type AuthStep = "splash" | "onboarding" | "phone" | "otp";
type InputRef = { focus: () => void };

const BLUE = colors.brand;
const INK = colors.text;
const MUTED = colors.textMuted;
const BORDER = colors.border;
const SURFACE = colors.background;

export default function Index() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [step, setStep] = useState<AuthStep>("splash");
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [countryCode, setCountryCode] = useState("+1");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [resendAt, setResendAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const otpRefs = useRef<(InputRef | null)[]>([]);

  useEffect(() => {
    if (step !== "splash") return;

    const timeout = setTimeout(() => setStep("onboarding"), 1400);
    return () => clearTimeout(timeout);
  }, [step]);

  useEffect(() => {
    if (step !== "otp") return;
    const updateCountdown = () => setSecondsLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [resendAt, step]);

  const auth: PhoneAuth = mode === "sign-in"
    ? { mode, resource: signIn }
    : { mode, resource: signUp };

  function startLogin(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setOtp(Array(6).fill(""));
    setStep("phone");
  }

  async function runRequest(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(getAuthError(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function startCooldown() {
    setResendAt(Date.now() + RESEND_DELAY_MS);
    setSecondsLeft(RESEND_DELAY_MS / 1000);
  }

  function sendOtp() {
    const phoneNumber = normalizePhoneNumber(countryCode, phone);
    if (!phoneNumber) {
      setError("Enter a valid phone number with its country code, for example +1 202 555 0123.");
      return;
    }
    void runRequest(async () => {
      await sendPhoneCode(auth, phoneNumber);
      Keyboard.dismiss();
      setSentTo(phoneNumber);
      setOtp(Array(6).fill(""));
      startCooldown();
      setStep("otp");
    });
  }

  function resendOtp() {
    if (Date.now() < resendAt) return;
    void runRequest(async () => {
      await resendPhoneCode(auth);
      setOtp(Array(6).fill(""));
      startCooldown();
      otpRefs.current[0]?.focus();
    });
  }

  function updateOtp(value: string, index: number) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    const start = digits.length === 6 ? 0 : index;
    const nextOtp = digits.length === 6 ? Array<string>(6).fill("") : [...otp];
    if (!digits) nextOtp[index] = "";
    for (let offset = 0; offset < digits.length && start + offset < 6; offset++) {
      nextOtp[start + offset] = digits[offset];
    }
    setOtp(nextOtp);
    setError("");
    if (digits) otpRefs.current[Math.min(start + digits.length, 5)]?.focus();
  }

  function verifyOtp() {
    void runRequest(async () => {
      await verifyPhoneCode(auth, otp.join(""));
      Keyboard.dismiss();
      // Clerk's active session unlocks /home through Stack.Protected.
    });
  }

  if (step === "splash") {
    return (
      <Pressable style={styles.splash} onPress={() => setStep("onboarding")}>
        <StatusBar style="light" />
        <View style={styles.splashCenter}>
          <BrandMark size={76} showName showTagline light />
          <Text style={styles.splashCaption}>Ride. Explore. Belong.</Text>
        </View>
        <Text style={[styles.version, { bottom: Math.max(insets.bottom, 24) }]}>v1.0.0</Text>
      </Pressable>
    );
  }

  if (step === "onboarding") {
    return (
      <View style={styles.onboarding}>
        <StatusBar style="light" />
        <ReferenceBackdrop />
        <View style={styles.onboardingShade} />
        <View style={[styles.onboardingContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.onboardingCopy}>
            <Text style={styles.onboardingTitle}>Ride. Explore.{"\n"}Belong.</Text>
            <Text style={styles.onboardingSubtitle}>
              Join riding communities, plan group rides, navigate together, stay connected, and ride safer — all in one app.
            </Text>
            <View style={styles.dots} accessibilityLabel="Onboarding page 1 of 3">
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get started"
            style={styles.primaryButton}
            onPress={() => startLogin("sign-up")}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Text style={styles.primaryButtonArrow}>→</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => startLogin("sign-in")} style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>Already have an account? </Text>
            <Text style={styles.loginPromptLink}>Log in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.formScreen}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.formScrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 28),
            paddingTop: Math.max(insets.top, 18),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            disabled={busy}
            onPress={() => {
              setError("");
              setOtp(Array(6).fill(""));
              setStep(step === "otp" ? "phone" : "onboarding");
            }}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <BrandMark size={27} showName />
          <View style={styles.headerSpacer} />
        </View>

        {step === "phone" ? (
          <View style={styles.formBody}>
            <Text style={styles.formTitle}>{mode === "sign-in" ? "Log in with your phone" : "Join with your phone"}</Text>
            <Text style={styles.formSubtitle}>We’ll send a 6-digit code to verify your number.</Text>

            <View style={styles.phoneRow}>
              <TextInput
                accessibilityLabel="Country calling code"
                editable={!busy}
                keyboardType="phone-pad"
                maxLength={4}
                onChangeText={(value) => setCountryCode(`+${value.replace(/\D/g, "")}`)}
                selectTextOnFocus
                style={styles.countrySelector}
                value={countryCode}
              />
              <TextInput
                accessibilityLabel="Phone number"
                autoComplete="tel"
                editable={!busy}
                keyboardType="phone-pad"
                onChangeText={setPhone}
                placeholder="Phone number"
                placeholderTextColor={colors.textMuted}
                style={styles.phoneInput}
                value={phone}
              />
            </View>
            {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}

            <Button label="Send OTP" loadingLabel="Sending code…" loading={busy} onPress={sendOtp} style={styles.formAction} />
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => startLogin(mode === "sign-in" ? "sign-up" : "sign-in")}
              style={styles.switchMode}
            >
              <Text style={styles.switchModeText}>{mode === "sign-in" ? "New to Groupify? Sign up" : "Already have an account? Log in"}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.formBody}>
            <Text style={styles.formTitle}>Enter OTP</Text>
            <Text style={styles.formSubtitle}>Sent to {sentTo}</Text>

            <View style={styles.otpRow}>
              {otp.map((value, index) => (
                <TextInput
                  accessibilityLabel={`OTP digit ${index + 1}`}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  textContentType={index === 0 ? "oneTimeCode" : "none"}
                  editable={!busy}
                  key={index}
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={(nextValue) => updateOtp(nextValue, index)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
                      otpRefs.current[index - 1]?.focus();
                    }
                  }}
                  ref={(ref) => {
                    otpRefs.current[index] = ref;
                  }}
                  selectTextOnFocus
                  style={[styles.otpInput, value ? styles.otpInputFilled : null]}
                  value={value}
                />
              ))}
            </View>
            {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={secondsLeft > 0 || busy}
              onPress={resendOtp}
              style={styles.resendButton}
            >
              <Text style={styles.resendLabel}>Resend code </Text>
              <Text style={styles.resendValue}>{secondsLeft > 0 ? `in 00:${String(secondsLeft).padStart(2, "0")}` : "now"}</Text>
            </Pressable>

            <Button label="Verify & Continue" loadingLabel="Verifying code…" loading={busy} disabled={otp.join("").length !== 6} onPress={verifyOtp} style={styles.formAction} />
          </View>
        )}
        {Platform.OS === "web" ? <View nativeID="clerk-captcha" /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  splash: {
    alignItems: "center",
    backgroundColor: "#070B12",
    flex: 1,
    justifyContent: "center",
    maxWidth: 430,
    width: "100%",
    alignSelf: "center",
  },
  splashCenter: {
    alignItems: "center",
    marginTop: -24,
  },
  splashCaption: {
    color: "#D9E4F2",
    fontSize: 15,
    fontStyle: "italic",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
    marginTop: 17,
  },
  version: {
    color: "#748196",
    fontSize: 11,
    letterSpacing: 0.8,
    position: "absolute",
  },
  onboarding: {
    backgroundColor: "#0A121E",
    flex: 1,
    overflow: "hidden",
    maxWidth: 430,
    width: "100%",
    alignSelf: "center",
  },
  onboardingShade: {
    backgroundColor: "rgba(3, 9, 16, 0.3)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  onboardingContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  onboardingCopy: {
    marginBottom: 28,
  },
  onboardingTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  onboardingSubtitle: {
    color: "#E5ECF5",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    maxWidth: 350,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 20,
  },
  dot: {
    backgroundColor: "rgba(238, 245, 255, 0.55)",
    borderRadius: 4,
    height: 5,
    width: 5,
  },
  activeDot: {
    backgroundColor: "#FFFFFF",
    width: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: BLUE,
    borderRadius: 14,
    flexDirection: "row",
    height: 52,
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold",
  },
  primaryButtonArrow: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    marginLeft: 10,
    marginTop: -1,
  },
  loginPrompt: {
    alignSelf: "center",
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 15,
  },
  loginPromptText: {
    color: "#C5D0DE",
    fontSize: 12,
  },
  loginPromptLink: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_800ExtraBold",
  },
  formScreen: {
    backgroundColor: SURFACE,
    flex: 1,
    maxWidth: 430,
    width: "100%",
    alignSelf: "center",
  },
  formScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  formHeader: {
    alignItems: "center",
    flexDirection: "row",
    height: 42,
  },
  backButton: {
    alignItems: "flex-start",
    justifyContent: "center",
    width: 45,
  },
  backIcon: {
    color: INK,
    fontSize: 35,
    fontFamily: "Inter_300Light",
    lineHeight: 36,
    marginTop: -3,
  },
  headerSpacer: {
    flex: 1,
  },
  formBody: {
    marginTop: 55,
  },
  formTitle: {
    color: INK,
    fontSize: 25,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.6,
    lineHeight: 31,
  },
  formSubtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    maxWidth: 320,
  },
  phoneRow: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: BORDER,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    height: 54,
    marginTop: 32,
    overflow: "hidden",
  },
  countrySelector: {
    borderRightColor: BORDER,
    borderRightWidth: 1,
    color: INK,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    height: "100%",
    textAlign: "center",
    width: 68,
  },
  switchMode: { alignItems: "center", padding: 16, minHeight: 44 },
  switchModeText: { color: BLUE, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  phoneInput: {
    color: INK,
    flex: 1,
    fontSize: 16,
    height: "100%",
    paddingHorizontal: 16,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: 12,
    marginTop: 8,
  },
  formAction: { marginTop: 20 },
  otpRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 31,
  },
  otpInput: {
    backgroundColor: "#FFFFFF",
    borderColor: BORDER,
    borderRadius: 9,
    borderWidth: 1,
    color: INK,
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    height: 52,
    minWidth: 0,
    padding: 0,
    textAlign: "center",
  },
  otpInputFilled: {
    borderColor: "#AFC5FF",
  },
  resendButton: {
    alignSelf: "center",
    flexDirection: "row",
    marginTop: 19,
    padding: 7,
  },
  resendLabel: {
    color: MUTED,
    fontSize: 13,
  },
  resendValue: {
    color: BLUE,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
