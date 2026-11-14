import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getAuthError,
  normalizePhoneNumber,
  resendPhoneCode,
  sendPhoneCode,
  verifyPhoneCode,
} from "../src/lib/phone-auth.ts";

function fixture(mode, { status = "complete", verifyError = null, sendError = null, finalizeError = null } = {}) {
  const calls = [];
  const send = async (params) => { calls.push(["send", params]); return { error: sendError }; };
  const verify = async (params) => { calls.push(["verify", params]); return { error: verifyError }; };
  const resource = {
    status,
    missingFields: [],
    create: async (params) => { calls.push(["create", params]); return { error: null }; },
    phoneCode: { sendCode: send, verifyCode: verify },
    verifications: { sendPhoneCode: send, verifyPhoneCode: verify },
    finalize: async () => { calls.push(["finalize"]); return { error: finalizeError }; },
  };
  return { auth: { mode, resource }, calls };
}

test("phone normalization preserves country codes and rejects malformed input", () => {
  assert.equal(normalizePhoneNumber("+1", "(202) 555-0123"), "+12025550123");
  assert.equal(normalizePhoneNumber("+880", "1712345678"), "+8801712345678");
  assert.equal(normalizePhoneNumber("+1", "+44 7700 900123"), "+447700900123");
  for (const value of ["", "123", "202call5550123", "++12025550123", "+0123456789", "+1234567890123456"]) {
    assert.equal(normalizePhoneNumber("+1", value), null);
  }
});

for (const mode of ["sign-in", "sign-up"]) {
  test(`${mode}: sends and resends through Clerk`, async () => {
    const { auth, calls } = fixture(mode);
    await sendPhoneCode(auth, "+12025550123");
    await resendPhoneCode(auth);
    assert.equal(calls.filter(([name]) => name === "send").length, 2);
    assert.equal(calls.some(([name]) => name === "finalize"), false);
    if (mode === "sign-up") assert.deepEqual(calls[0], ["create", { phoneNumber: "+12025550123" }]);
    else assert.deepEqual(calls[0], ["send", { phoneNumber: "+12025550123" }]);
  });

  test(`${mode}: never activates a session for an incorrect or expired code`, async () => {
    const failure = new Error("Code is invalid or expired");
    const { auth, calls } = fixture(mode, { verifyError: failure });
    await assert.rejects(verifyPhoneCode(auth, "123456"), failure);
    assert.equal(calls.some(([name]) => name === "finalize"), false);
  });

  test(`${mode}: incomplete verification cannot finalize`, async () => {
    const { auth, calls } = fixture(mode, { status: mode === "sign-in" ? "needs_second_factor" : "missing_requirements" });
    await assert.rejects(verifyPhoneCode(auth, "123456"), /additional verification/);
    assert.equal(calls.some(([name]) => name === "finalize"), false);
  });

  test(`${mode}: activates only after successful verification`, async () => {
    const { auth, calls } = fixture(mode);
    await verifyPhoneCode(auth, "123456");
    assert.deepEqual(calls, [["verify", { code: "123456" }], ["finalize"]]);
  });

  test(`${mode}: propagates send and session activation failures`, async () => {
    const failure = new Error("Network unavailable");
    await assert.rejects(sendPhoneCode(fixture(mode, { sendError: failure }).auth, "+12025550123"), failure);
    await assert.rejects(resendPhoneCode(fixture(mode, { sendError: failure }).auth), failure);
    await assert.rejects(verifyPhoneCode(fixture(mode, { finalizeError: failure }).auth, "123456"), failure);
  });

  test(`${mode}: rejects incomplete codes before making a verification request`, async () => {
    const { auth, calls } = fixture(mode);
    await assert.rejects(verifyPhoneCode(auth, "12345"), /six-digit/);
    assert.deepEqual(calls, []);
  });
}

test("sign-up fails before sending SMS when creation fails or required fields are missing", async () => {
  const { auth, calls } = fixture("sign-up");
  auth.resource.missingFields = ["email_address"];
  await assert.rejects(sendPhoneCode(auth, "+12025550123"), /additional details/);
  assert.equal(calls.some(([name]) => name === "send"), false);
  auth.resource.create = async () => ({ error: new Error("Sign-up is disabled") });
  await assert.rejects(sendPhoneCode(auth, "+12025550123"), /disabled/);
});

test("Clerk errors produce actionable messages without dumping the response", () => {
  assert.match(getAuthError({ code: "form_identifier_exists" }), /Log in/);
  assert.match(getAuthError({ errors: [{ code: "form_identifier_not_found" }] }), /Sign up/);
  assert.match(getAuthError({ code: "too_many_requests" }), /wait/);
  assert.match(getAuthError({ code: "verification_expired" }), /expired.*new code/);
  assert.match(getAuthError({ errors: [{ code: "form_code_incorrect" }] }), /incorrect/);
  assert.match(getAuthError({ code: "unsupported_country_code" }), /SMS is unavailable/);
  assert.match(getAuthError({ code: "captcha_invalid" }), /Verification could not be completed/);
  assert.match(getAuthError({ code: "service_unavailable" }), /temporarily unavailable/);
});

test("unrecognized provider/transport failures never reflect text, nested metadata, stacks or causes", () => {
  const marker = "synthetic_sensitive_marker";
  for (const error of [new Error(marker, { cause: marker }), { longMessage: marker }, { message: marker },
    { errors: [{ code: marker, message: marker, longMessage: marker, meta: { private: marker } }] },
    { errors: marker }, { errors: [null] }, { errors: [marker] }, { code: "__proto__" }, { code: "toString" }, null, undefined, marker]) {
    const result = getAuthError(error);
    assert.equal(result, "We couldn’t complete that request. Please try again.");
    assert.ok(!result.includes(marker));
  }
  for (const code of ["form_identifier_exists", "form_identifier_not_found", "too_many_requests", "form_code_incorrect", "verification_expired", "unsupported_country_code", "captcha_invalid", "service_unavailable"]) {
    const result = getAuthError({ errors: [{ code, longMessage: marker, message: marker, meta: { private: marker } }] });
    assert.ok(!result.includes(marker));
    assert.notEqual(result, "We couldn’t complete that request. Please try again.");
  }
});

test("local setup/verification instructions survive without trusting arbitrary Error messages", async () => {
  const incomplete = fixture("sign-in", { status: "needs_second_factor" });
  await assert.rejects(verifyPhoneCode(incomplete.auth, "123456"), (error) => /additional verification/.test(getAuthError(error)));
  const setup = fixture("sign-up"); setup.auth.resource.missingFields = ["email_address"];
  await assert.rejects(sendPhoneCode(setup.auth, "+12025550123"), (error) => /additional details/.test(getAuthError(error)));
  await assert.rejects(verifyPhoneCode(fixture("sign-in").auth, "123"), (error) => /six-digit/.test(getAuthError(error)));
});
