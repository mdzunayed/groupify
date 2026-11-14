import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException, PreconditionFailedException } from "@nestjs/common";

import { AccountAuthorizationService } from "../accounts/account-authorization.service";

type RiderType = "motorcycle" | "bicycle";
export type ProfileText = Readonly<{ profileId: string; displayName: string; riderType: RiderType; vehicleDescription: string | null; version: string }>;
type StoredProfile = { id: string; display_name: string; rider_type: RiderType; vehicle_description: string | null; version: string };
const columns = "id, display_name, rider_type, vehicle_description, version::text AS version";

function invalid(): never { throw new BadRequestException("Profile text is invalid"); }
function text(value: unknown, maximum: number) {
  if (typeof value !== "string") return invalid();
  const normalized = value.normalize("NFC").trim();
  if (Array.from(normalized).length > maximum || /[\p{Cc}\p{Cs}]/u.test(normalized)) return invalid();
  return normalized;
}
function input(body: unknown, partial: boolean) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return invalid();
  const value = body as Record<string, unknown>;
  const keys = Object.keys(value);
  if (!keys.length || keys.some((key) => !["displayName", "riderType", "vehicleDescription"].includes(key))) return invalid();
  const hasName = Object.hasOwn(value, "displayName");
  const hasType = Object.hasOwn(value, "riderType");
  const hasVehicle = Object.hasOwn(value, "vehicleDescription");
  if (!partial && (!hasName || !hasType)) return invalid();
  const displayName = hasName ? text(value.displayName, 80) : undefined;
  if (hasName && !displayName) return invalid();
  const riderType = hasType ? value.riderType : undefined;
  if (hasType && riderType !== "motorcycle" && riderType !== "bicycle") return invalid();
  const vehicleDescription = hasVehicle && value.vehicleDescription !== null ? text(value.vehicleDescription, 160) || null : null;
  return { displayName, riderType, vehicleDescription, hasVehicle };
}
function version(ifMatch: unknown) {
  if (ifMatch === undefined) throw new HttpException("A profile version is required", 428);
  const match = typeof ifMatch === "string" ? /^"profile-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-([1-9][0-9]{0,18})"$/.exec(ifMatch) : null;
  if (!match || BigInt(match[2]) > 9223372036854775807n) return invalid();
  return { profileId: match[1], version: match[2] };
}
function result(row: StoredProfile): ProfileText {
  return Object.freeze({ profileId: row.id, displayName: row.display_name, riderType: row.rider_type, vehicleDescription: row.vehicle_description, version: row.version });
}

@Injectable()
export class ProfileTextService {
  constructor(private readonly accounts: AccountAuthorizationService) {}

  async get(authorization: unknown): Promise<ProfileText> {
    return this.accounts.withActiveAccount(authorization, async (client, account) => {
      const value = await client.query<StoredProfile>(`SELECT ${columns} FROM rider_profiles WHERE account_id = $1`, [account.id]);
      if (!value.rows[0]) throw new NotFoundException("Profile is absent");
      return result(value.rows[0]);
    });
  }

  async create(authorization: unknown, body: unknown): Promise<ProfileText> {
    return this.accounts.withActiveAccount(authorization, async (client, account) => {
      const value = input(body, false);
      const inserted = await client.query<StoredProfile>(`INSERT INTO rider_profiles (account_id, display_name, rider_type, vehicle_description)
        VALUES ($1, $2, $3, $4) ON CONFLICT (account_id) DO NOTHING RETURNING ${columns}`,
      [account.id, value.displayName, value.riderType, value.vehicleDescription]);
      if (!inserted.rows[0]) throw new ConflictException("Profile already exists");
      return result(inserted.rows[0]);
    });
  }

  async update(authorization: unknown, ifMatch: unknown, body: unknown): Promise<ProfileText> {
    return this.accounts.withActiveAccount(authorization, async (client, account) => {
      const value = input(body, true);
      const expected = version(ifMatch);
      const updated = await client.query<StoredProfile>(`UPDATE rider_profiles SET
        display_name = COALESCE($1, display_name), rider_type = COALESCE($2, rider_type),
        vehicle_description = CASE WHEN $3 THEN $4 ELSE vehicle_description END,
        version = version + 1, updated_at = clock_timestamp()
        WHERE account_id = $5 AND id = $6::uuid AND version = $7::bigint RETURNING ${columns}`,
      [value.displayName ?? null, value.riderType ?? null, value.hasVehicle, value.vehicleDescription, account.id, expected.profileId, expected.version]);
      if (!updated.rows[0]) {
        const exists = await client.query("SELECT 1 FROM rider_profiles WHERE account_id = $1", [account.id]);
        if (!exists.rowCount) throw new NotFoundException("Profile is absent");
        throw new PreconditionFailedException("Profile version is stale");
      }
      return result(updated.rows[0]);
    });
  }
}
