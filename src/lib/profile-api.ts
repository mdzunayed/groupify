export type RiderType = "motorcycle" | "bicycle";
export type ProfileText = Readonly<{ profileId: string; displayName: string; riderType: RiderType; vehicleDescription: string | null; version: string }>;
export type ProfileRecord = Readonly<{ profile: ProfileText; etag: string }>;
export type ProfileInput = { displayName: string; riderType: RiderType; vehicleDescription?: string | null };
export type ProfileFailure = "configuration" | "authentication" | "forbidden" | "invalid" | "conflict" | "network" | "unavailable" | "protocol" | "cancelled";

export class ProfileApiError extends Error {
  readonly kind: ProfileFailure;
  constructor(kind: ProfileFailure) {
    super("Rider details request failed.");
    this.name = "ProfileApiError";
    this.kind = kind;
  }
}

type TransportResponse = { status: number; redirected?: boolean; headers: { get(name: string): string | null }; json(): Promise<unknown> };
export type ProfileTransport = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal; credentials: "omit"; redirect: "error" }) => Promise<TransportResponse>;
type Options = { baseUrl: string | undefined; getToken: () => Promise<string | null>; fetcher?: ProfileTransport };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function fail(kind: ProfileFailure): never { throw new ProfileApiError(kind); }
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function canonicalText(value: unknown, maximum: number) {
  return typeof value === "string" && !!value && value.trim() === value && Array.from(value).length <= maximum &&
    !/[\u0000-\u001f\u007f-\u009f]/.test(value) && Array.from(value).every((character) => {
      const point = character.codePointAt(0)!;
      return point < 0xd800 || point > 0xdfff;
    });
}
function baseUrl(value: string | undefined) {
  try {
    if (!value?.trim()) return fail("configuration");
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return fail("configuration");
    return url.toString().replace(/\/+$/, "");
  } catch { return fail("configuration"); }
}
function statusFailure(status: number): never {
  if (status === 401) return fail("authentication");
  if (status === 403) return fail("forbidden");
  if (status === 400 || status === 415) return fail("invalid");
  if (status === 409 || status === 412 || status === 428) return fail("conflict");
  return fail("unavailable");
}
async function json(response: TransportResponse) {
  if (response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return fail("protocol");
  try { return await response.json(); } catch { return fail("protocol"); }
}
async function profileRecord(response: TransportResponse): Promise<ProfileRecord> {
  const data = await json(response);
  if (!object(data) || Object.keys(data).sort().join(",") !== "displayName,profileId,riderType,vehicleDescription,version" ||
      typeof data.profileId !== "string" || !uuid.test(data.profileId) || !canonicalText(data.displayName, 80) ||
      !["motorcycle", "bicycle"].includes(data.riderType as string) ||
      !(data.vehicleDescription === null || canonicalText(data.vehicleDescription, 160)) ||
      typeof data.version !== "string" || !/^[1-9][0-9]{0,18}$/.test(data.version) ||
      (data.version.length === 19 && data.version > "9223372036854775807")) return fail("protocol");
  const etag = response.headers.get("etag");
  if (etag !== `"profile-${data.profileId}-${data.version}"` || response.headers.get("cache-control") !== "no-store") return fail("protocol");
  const profile = Object.freeze({ profileId: data.profileId, displayName: data.displayName as string, riderType: data.riderType as RiderType,
    vehicleDescription: data.vehicleDescription as string | null, version: data.version });
  return Object.freeze({ profile, etag });
}
function payload(input: Partial<ProfileInput>) {
  const body: Partial<ProfileInput> = {};
  for (const key of ["displayName", "riderType", "vehicleDescription"] as const) {
    if (input[key] !== undefined) Object.assign(body, { [key]: input[key] });
  }
  if (!Object.keys(body).length) return fail("invalid");
  return JSON.stringify(body);
}

/** Default Clerk token only; never choose a JWT template or store/log credentials. */
export function createProfileApi(options: Options) {
  const base = baseUrl(options.baseUrl);
  const fetcher: ProfileTransport = options.fetcher ?? globalThis.fetch;
  async function request(path: string, method: string, body?: string, etag?: string, signal?: AbortSignal) {
    if (signal?.aborted) return fail("cancelled");
    let token: string | null;
    try { token = await options.getToken(); } catch { return fail("authentication"); }
    if (signal?.aborted) return fail("cancelled");
    if (!token || /[^\x21-\x7e]/.test(token)) return fail("authentication");
    let response: TransportResponse;
    try {
      response = await fetcher(`${base}${path}`, { method, credentials: "omit", redirect: "error", signal,
        headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "Cache-Control": "no-store",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(etag ? { "If-Match": etag } : {}) },
        ...(body === undefined ? {} : { body }) });
    } catch { return fail(signal?.aborted ? "cancelled" : "network"); }
    if (signal?.aborted) return fail("cancelled");
    if (response.redirected) return fail("protocol");
    return response;
  }
  return Object.freeze({
    async bootstrap(signal?: AbortSignal) {
      const response = await request("/v1/accounts/bootstrap", "POST", undefined, undefined, signal);
      if (![200, 201].includes(response.status)) return statusFailure(response.status);
      const body = await json(response);
      if (!object(body) || Object.keys(body).join(",") !== "accountId" || typeof body.accountId !== "string" || !uuid.test(body.accountId)) return fail("protocol");
    },
    async get(signal?: AbortSignal): Promise<ProfileRecord | null> {
      const response = await request("/v1/me/profile", "GET", undefined, undefined, signal);
      if (response.status === 404) {
        const body = await json(response);
        if (!object(body) || body.statusCode !== 404 || body.code !== "NOT_FOUND" || typeof body.requestId !== "string" ||
            !uuid.test(body.requestId) || body.requestId !== response.headers.get("x-request-id")) return fail("protocol");
        return null;
      }
      if (response.status !== 200) return statusFailure(response.status);
      return profileRecord(response);
    },
    async create(input: ProfileInput, signal?: AbortSignal) {
      const response = await request("/v1/me/profile", "POST", payload(input), undefined, signal);
      if (response.status !== 201) return statusFailure(response.status);
      return profileRecord(response);
    },
    async update(input: Partial<ProfileInput>, record: ProfileRecord, signal?: AbortSignal) {
      if (record.etag !== `"profile-${record.profile.profileId}-${record.profile.version}"`) return fail("protocol");
      const response = await request("/v1/me/profile", "PATCH", payload(input), record.etag, signal);
      if (response.status !== 200) return statusFailure(response.status);
      return profileRecord(response);
    },
  });
}
