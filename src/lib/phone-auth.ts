import type { SignInFutureResource, SignUpFutureResource } from "@clerk/expo/types";

export type AuthMode = "sign-in" | "sign-up";
export type PhoneAuth =
  | { mode: "sign-in"; resource: SignInFutureResource }
  | { mode: "sign-up"; resource: SignUpFutureResource };

export const RESEND_DELAY_MS = 30_000;

export function normalizePhoneNumber(countryCode: string, phone: string) {
  const input = phone.trim();
  if (!/^[+\d\s().-]+$/.test(input)) return null;
  const number = input.startsWith("+")
    ? input.replace(/[\s().-]/g, "")
    : `${countryCode.trim()}${input.replace(/[\s().-]/g, "")}`;
  return /^\+[1-9]\d{7,14}$/.test(number) ? number : null;
}

export function getAuthError(error: unknown): string {
  if (error && typeof error === "object") {
    const detail = error as {
      code?: string;
      longMessage?: string;
      message?: string;
      errors?: { code?: string; longMessage?: string; message?: string }[];
    };
    const first = detail.errors?.[0] ?? detail;
    if (first.code === "form_identifier_exists") {
      return "An account with this number already exists. Choose Log in below.";
    }
    if (first.code === "form_identifier_not_found") {
      return "We couldn’t find an account with this number. Choose Sign up below.";
    }
    if (first.code === "too_many_requests") {
      return "Too many attempts. Please wait a moment before trying again.";
    }
    if (first.longMessage) return first.longMessage;
    if (first.message && error instanceof Error) return first.message;
  }
  return "We couldn’t connect. Check your connection and try again.";
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
    throw new Error("Account setup requires additional details. Please contact Groupify support.");
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
  if (!/^\d{6}$/.test(code)) throw new Error("Enter the full six-digit code.");

  const { error } = auth.mode === "sign-in"
    ? await auth.resource.phoneCode.verifyCode({ code })
    : await auth.resource.verifications.verifyPhoneCode({ code });
  if (error) throw error;

  // A valid first factor is not enough when Clerk requires another factor/task.
  // Never grant access just because the user has entered six digits.
  if (auth.resource.status !== "complete") {
    throw new Error("Your account requires additional verification. Please contact Groupify support.");
  }

  const { error: finalizeError } = await auth.resource.finalize();
  if (finalizeError) throw finalizeError;
}
