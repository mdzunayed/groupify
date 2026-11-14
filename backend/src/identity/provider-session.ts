import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";

// Read-only Clerk BAPI contract matching @clerk/backend 3.28.0. The SDK's
// getSession() does not accept an AbortSignal; use the supported REST endpoint
// so both the response and body have a bounded, cancellable network operation.
export async function assertActiveProviderSession(secretKey: string, sessionId: string, subject: string): Promise<void> {
  let session: unknown;
  try {
    const response = await fetch(`https://api.clerk.com/v1/sessions/${encodeURIComponent(sessionId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secretKey}`, "Clerk-API-Version": "2026-05-12", Accept: "application/json" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (response.status !== 200) {
      await response.body?.cancel();
      if (response.status === 404) throw new UnauthorizedException("Authentication is required");
      throw new Error();
    }
    session = await response.json();
  } catch (error) {
    if (error instanceof UnauthorizedException) throw error;
    // Provider credentials, rate limits, network and parse errors are not a
    // reason to accept a token offline or to expose the provider's response.
    throw new ServiceUnavailableException("Development identity verification is unavailable");
  }
  const now = Date.now();
  if (!session || typeof session !== "object" || Array.isArray(session) ||
      !("object" in session) || session.object !== "session" ||
      !("id" in session) || session.id !== sessionId ||
      !("user_id" in session) || session.user_id !== subject ||
      !("status" in session) || session.status !== "active" ||
      ("actor" in session && session.actor != null) ||
      !("expire_at" in session) || typeof session.expire_at !== "number" || !Number.isSafeInteger(session.expire_at) || session.expire_at <= now ||
      !("abandon_at" in session) || typeof session.abandon_at !== "number" || !Number.isSafeInteger(session.abandon_at) || session.abandon_at <= now) {
    throw new UnauthorizedException("Authentication is required");
  }
}
