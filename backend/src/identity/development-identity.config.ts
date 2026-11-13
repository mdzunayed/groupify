import { createPublicKey } from "node:crypto";
import { ServiceUnavailableException } from "@nestjs/common";

type DevelopmentIdentityConfig = {
  issuer: string;
  audience: string;
  authorizedParties: string[];
  publishableKey: string;
  secretKey: string;
  jwtKey: string;
};

export function developmentIdentityConfig(): DevelopmentIdentityConfig {
  try {
    if (process.env.GROUPIFY_DEV_AUTH_ENABLED !== "true" ||
        !["development", "test"].includes(process.env.NODE_ENV ?? "")) throw new Error();
    const issuer = process.env.CLERK_ISSUER?.trim() ?? "";
    const audience = process.env.CLERK_AUDIENCE?.trim() ?? "";
    const authorizedParties = (process.env.CLERK_AUTHORIZED_PARTIES ?? "").split(",").map((value) => value.trim());
    const publishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim() ?? "";
    const secretKey = process.env.CLERK_SECRET_KEY?.trim() ?? "";
    const jwtKey = process.env.CLERK_JWT_KEY?.trim() ?? "";
    const url = new URL(issuer);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
    if (!audience || !publishableKey.startsWith("pk_test_") || !secretKey.startsWith("sk_test_") || !authorizedParties.length) throw new Error();
    for (const party of authorizedParties) {
      const origin = new URL(party);
      if (origin.protocol !== "https:" || origin.origin !== party) throw new Error();
    }
    if (!jwtKey.startsWith("-----BEGIN PUBLIC KEY-----") || !jwtKey.endsWith("-----END PUBLIC KEY-----") ||
        createPublicKey(jwtKey).asymmetricKeyType !== "rsa") throw new Error();
    return { issuer, audience, authorizedParties, publishableKey, secretKey, jwtKey };
  } catch {
    // Never include configuration values or crypto parser errors in exceptions.
    throw new ServiceUnavailableException("Development identity verification is unavailable");
  }
}
