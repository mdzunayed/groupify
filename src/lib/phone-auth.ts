import type { SignInFutureResource, SignUpFutureResource } from "@clerk/expo/types";

export type AuthMode = "sign-in" | "sign-up";
export type PhoneAuth =
  | { mode: "sign-in"; resource: SignInFutureResource }
  | { mode: "sign-up"; resource: SignUpFutureResource };

export const RESEND_DELAY_MS = 30_000;

const localMessages = {
  setup_required: "Account setup requires additional details. Please contact Groupify support.",
  verification_required: "Your account requires additional verification. Please contact Groupify support.",
  incomplete_code: "Enter the full six-digit code.",
};
class PhoneAuthError extends Error {
  readonly kind: keyof typeof localMessages;
  constructor(kind: keyof typeof localMessages) {
    super(localMessages[kind]);
    this.name = "PhoneAuthError";
    this.kind = kind;
  }
}
const fallbackMessage = "We couldn’t complete that request. Please try again.";
const providerMessages = new Map([
  ["form_identifier_exists", "An account with this number already exists. Choose Log in below."],
  ["form_identifier_not_found", "We couldn’t find an account with this number. Choose Sign up below."],
  ["too_many_requests", "Too many attempts. Please wait a moment before trying again."],
  ["form_code_incorrect", "That code is incorrect. Check it and try again."],
  ["verification_expired", "That code has expired. Request a new code."],
  ["unsupported_country_code", "SMS is unavailable for this country. Please contact Groupify support."],
  ["captcha_invalid", "Verification could not be completed. Please try again."],
  ["service_unavailable", "The service is temporarily unavailable. Please try again later."],
]);

export function normalizePhoneNumber(countryCode: string, phone: string) {
  const input = phone.trim();
  if (!/^[+\d\s().-]+$/.test(input)) return null;
  const number = input.startsWith("+")
    ? input.replace(/[\s().-]/g, "")
    : `${countryCode.trim()}${input.replace(/[\s().-]/g, "")}`;
  return /^\+[1-9]\d{7,14}$/.test(number) ? number : null;
}

export function getAuthError(error: unknown): string {
  if (error instanceof PhoneAuthError) return localMessages[error.kind];
  if (error && typeof error === "object") {
    const detail = error as { code?: unknown; errors?: unknown };
    const first = Array.isArray(detail.errors) ? detail.errors[0] ?? detail : detail;
    if (first && typeof first === "object" && "code" in first && typeof first.code === "string") {
      return providerMessages.get(first.code) ?? fallbackMessage;
    }
  }
  return fallbackMessage;
}

export async function sendPhoneCode(auth: PhoneAuth, phoneNumber: string) {
  if (auth.mode === "sign-in") {
    const { error } = await auth.resource.phoneCode.sendCode({ phoneNumber });
    if (error) throw error;
    return;
  }

  const { error } = await auth.resource.create({ phoneNumber });
  if (error) throw error;
  if (auth.resource.missingFields.length > 0) {
    throw new PhoneAuthError("setup_required");
  }
  const { error: sendError } = await auth.resource.verifications.sendPhoneCode();
  if (sendError) throw sendError;
}

export async function resendPhoneCode(auth: PhoneAuth) {
  const { error } = auth.mode === "sign-in"
    ? await auth.resource.phoneCode.sendCode()
    : await auth.resource.verifications.sendPhoneCode();
  if (error) throw error;
}

export async function verifyPhoneCode(auth: PhoneAuth, code: string) {
  if (!/^\d{6}$/.test(code)) throw new PhoneAuthError("incomplete_code");

  const { error } = auth.mode === "sign-in"
    ? await auth.resource.phoneCode.verifyCode({ code })
    : await auth.resource.verifications.verifyPhoneCode({ code });
  if (error) throw error;

  // A valid first factor is not enough when Clerk requires another factor/task.
  // Never grant access just because the user has entered six digits.
  if (auth.resource.status !== "complete") {
    throw new PhoneAuthError("verification_required");
  }

  const { error: finalizeError } = await auth.resource.finalize();
  if (finalizeError) throw finalizeError;
}
