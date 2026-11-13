import { createClerkClient } from "@clerk/backend";
import { Injectable, UnauthorizedException } from "@nestjs/common";

import { developmentIdentityConfig } from "./development-identity.config";

export type VerifiedExternalIdentity = Readonly<{
  provider: "clerk";
  issuer: string;
  subject: string;
  sessionId: string;
}>;

@Injectable()
export class DevelopmentIdentityService {
  async verifyBearer(authorization: unknown): Promise<VerifiedExternalIdentity> {
    const config = developmentIdentityConfig();
    try {
      // A session JWT only: no cookie fallback, API keys, comma lists or whitespace.
      const bearer = typeof authorization === "string"
        ? /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(authorization)
        : null;
      if (!bearer) throw new Error();
      const clerk = createClerkClient({
        publishableKey: config.publishableKey,
        secretKey: config.secretKey,
        jwtKey: config.jwtKey,
        telemetry: { disabled: true },
      });
      const result = await clerk.authenticateRequest(new Request("https://groupify.invalid/", {
        method: "POST", headers: { authorization: `Bearer ${bearer[1]}` },
      }), {
        acceptsToken: "session_token",
        issuer: config.issuer,
        audience: config.audience,
        authorizedParties: config.authorizedParties,
        clockSkewInMs: 0,
      });
      if (!result.isAuthenticated || result.status !== "signed-in") throw new Error();
      const auth = result.toAuth({ treatPendingAsSignedOut: true });
      const claims = auth.sessionClaims;
      const audience = claims?.aud;
      if (typeof auth.userId !== "string" || !auth.userId.trim() || typeof auth.sessionId !== "string" || !auth.sessionId.trim() ||
          auth.actor || !claims || claims.act != null || claims.v !== 2 || claims.sts !== "active" ||
          claims.iss !== config.issuer || typeof claims.azp !== "string" || !config.authorizedParties.includes(claims.azp) ||
          !(typeof audience === "string" ? audience === config.audience : Array.isArray(audience) && audience.every((value) => typeof value === "string") && audience.includes(config.audience)) ||
          ![claims.iat, claims.nbf, claims.exp].every(Number.isInteger) || claims.exp <= claims.iat || claims.exp <= claims.nbf) {
        throw new Error();
      }
      return Object.freeze({ provider: "clerk", issuer: config.issuer, subject: auth.userId, sessionId: auth.sessionId });
    } catch {
      // Do not leak SDK messages, claims, keys, token values or refresh/handshake hints.
      throw new UnauthorizedException("Authentication is required");
    }
  }
}
