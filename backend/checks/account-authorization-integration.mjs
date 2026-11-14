import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { ConflictException } from "@nestjs/common";
import pg from "pg";

const require = createRequire(import.meta.url);
const { AccountAuthorizationService } = require("../dist/accounts/account-authorization.service.js");
const { AccountProvisioningService } = require("../dist/accounts/account-provisioning.service.js");
const migration = require("../migrations/1794672000000_account_identity_boundary.cjs");
let admin;
let accountId;
let identity;
let service;
let provisioner;
let provisioned;

before(async () => {
  assert.ok(process.env.DATABASE_URL, "Use the disposable integration database");
  admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
});
after(async () => { await admin?.end(); });
beforeEach(async () => {
  const result = await admin.query("INSERT INTO accounts DEFAULT VALUES RETURNING id");
  accountId = result.rows[0].id;
  identity = Object.freeze({ provider: "clerk", issuer: "https://identity.example.test", subject: `user_fixture_${accountId}`, sessionId: "sess_fixture" });
  // The separate SDK suite verifies tokens/provider reads. Here only external
  // identity is stubbed; connections, SQL, constraints and locks are real.
  service = new AccountAuthorizationService({ verifyBearer: async () => identity });
  provisioner = new AccountProvisioningService({ verifyBearer: async () => identity });
  provisioned = new Set();
});
afterEach(async () => {
  const ids = [accountId, ...provisioned];
  await admin.query("DELETE FROM external_identities WHERE account_id = ANY($1::uuid[])", [ids]);
  await admin.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [ids]);
});
async function link(overrides = {}) {
  const value = { ...identity, ...overrides };
  await admin.query("INSERT INTO external_identities (account_id, provider, issuer, subject) VALUES ($1, $2, $3, $4)",
    [accountId, value.provider, value.issuer, value.subject]);
}
async function denied() {
  let called = false;
  await assert.rejects(service.withActiveAccount("fixture", async () => { called = true; }), (error) => {
    assert.equal(error.getStatus(), 403);
    assert.equal(error.message, "Account access is not allowed");
    return true;
  });
  assert.equal(called, false);
}

test("a valid external identity alone neither authorizes nor bootstraps an account", async () => {
  await denied();
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM external_identities WHERE account_id = $1", [accountId])).rows[0].count, 0);
});

test("exact active mapping supplies only the immutable internal account ID and commits protected SQL", async () => {
  await link();
  const value = await service.withActiveAccount("fixture", async (client, account) => {
    assert.deepEqual(account, { id: accountId });
    assert.ok(Object.isFrozen(account));
    await client.query("INSERT INTO external_identities (account_id, provider, issuer, subject) VALUES ($1, $2, $3, $4)",
      [account.id, identity.provider, identity.issuer, `${identity.subject}_committed`]);
    return "committed";
  });
  assert.equal(value, "committed");
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM external_identities WHERE account_id = $1", [accountId])).rows[0].count, 2);
});

test("identity matching is exact, parameterized and never resolved by session ID", async () => {
  for (const overrides of [
    { provider: "other-provider" }, { issuer: identity.issuer.toUpperCase() },
    { subject: identity.subject.toUpperCase() }, { subject: identity.sessionId },
  ]) {
    await link(overrides);
    await denied();
    await admin.query("DELETE FROM external_identities WHERE account_id = $1", [accountId]);
  }
  await link();
  identity = { ...identity, subject: "' OR TRUE; DROP TABLE accounts; --" };
  await denied();
  assert.equal((await admin.query("SELECT state FROM accounts WHERE id = $1", [accountId])).rows[0].state, "active");
});

test("a prior successful verification does not authorize a subsequently deactivated account", async () => {
  await link();
  await service.withActiveAccount("fixture", async () => undefined);
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [accountId]);
  await denied();
});

test("constraints prevent ambiguous identity links, orphan links, invalid states and accidental linked-account deletion", async () => {
  await link();
  await assert.rejects(link(), (error) => error.code === "23505");
  await assert.rejects(admin.query("INSERT INTO external_identities (account_id, provider, issuer, subject) VALUES (gen_random_uuid(), 'clerk', 'fixture', 'fixture')"), (error) => error.code === "23503");
  await assert.rejects(admin.query("UPDATE accounts SET state = 'unknown' WHERE id = $1", [accountId]), (error) => error.code === "23514");
  await assert.rejects(admin.query("DELETE FROM accounts WHERE id = $1", [accountId]), (error) => error.code === "23503");
});

test("a failed protected operation rolls its SQL back and preserves a safe domain exception", async () => {
  await link();
  await assert.rejects(service.withActiveAccount("fixture", async (client, account) => {
    await client.query("DELETE FROM external_identities WHERE account_id = $1", [account.id]);
    throw new ConflictException("Synthetic conflict");
  }), (error) => error.getStatus() === 409);
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM external_identities WHERE account_id = $1", [accountId])).rows[0].count, 1);
});

test("swallowing a SQL error cannot report a rolled-back transaction as committed", async () => {
  await link();
  await assert.rejects(service.withActiveAccount("fixture", async (client) => {
    await client.query("SELECT 1 / 0").catch(() => undefined);
    return "must not be returned";
  }), (error) => error.getStatus() === 503 && error.cause === undefined);
});

test("deactivation and identity removal wait for the protected transaction's row locks", async () => {
  await link();
  for (const sql of ["UPDATE accounts SET state = 'deactivated' WHERE id = $1", "DELETE FROM external_identities WHERE account_id = $1"]) {
    const writer = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await writer.connect();
    const pid = (await writer.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    let enter;
    let release;
    const entered = new Promise((resolve) => { enter = resolve; });
    const barrier = new Promise((resolve) => { release = resolve; });
    const operation = service.withActiveAccount("fixture", async () => { enter(); await barrier; return "finished"; });
    operation.catch(() => undefined);
    let change;
    try {
      await Promise.race([entered, operation]);
      let settled = false;
      change = writer.query(sql, [accountId]).finally(() => { settled = true; });
      change.catch(() => undefined);
      let waiting = false;
      const deadline = Date.now() + 2000;
      while (!settled && Date.now() < deadline) {
        const state = (await admin.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1", [pid])).rows[0];
        if (state?.wait_event_type === "Lock") { waiting = true; break; }
        await delay(10);
      }
      assert.ok(waiting, "The database must confirm the change is blocked by a row lock");
      release();
      assert.equal(await operation, "finished");
      await change;
      await denied();
    } finally {
      release();
      await operation.catch(() => undefined);
      await change?.catch(() => undefined);
      await writer.end();
      await admin.query("UPDATE accounts SET state = 'active' WHERE id = $1", [accountId]);
    }
  }
});

test("a status change before database authorization is observed after provider verification returns", async () => {
  await link();
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  service = new AccountAuthorizationService({ verifyBearer: async () => { await barrier; return identity; } });
  const request = denied();
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [accountId]);
  release();
  await request;
});

test("migration rollback refuses to discard populated account or identity tables", async () => {
  await link();
  let sql;
  migration.down({ sql: (value) => { sql = value; } });
  await admin.query("BEGIN");
  try {
    await assert.rejects(admin.query(sql), (error) => error.code === "P0001" && error.message === "Account identity rollback requires empty tables");
  } finally {
    await admin.query("ROLLBACK");
  }
  assert.equal((await admin.query("SELECT count(*)::int AS count FROM external_identities WHERE account_id = $1", [accountId])).rows[0].count, 1);
});

async function provision() {
  const value = await provisioner.provision("fixture");
  provisioned.add(value.id);
  return value;
}
async function accountCount() {
  return (await admin.query("SELECT count(*)::int AS count FROM accounts")).rows[0].count;
}

test("explicit provisioning commits one new mapping and a replay resolves that same account", async () => {
  const first = await provision();
  assert.equal(first.created, true);
  assert.ok(Object.isFrozen(first));
  const again = await provision();
  assert.deepEqual(again, { id: first.id, created: false });
  assert.equal((await admin.query("SELECT account_id FROM external_identities WHERE subject = $1", [identity.subject])).rows[0].account_id, first.id);
});

test("concurrent explicit provisioning converges to one account without orphans", async () => {
  const before = await accountCount();
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => provision()));
  assert.ok(results.every((value) => value.status === "fulfilled"));
  const values = results.map((value) => value.value);
  assert.equal(new Set(values.map((value) => value.id)).size, 1);
  assert.equal(values.filter((value) => value.created).length, 1);
  assert.equal(await accountCount(), before + 1);
});

test("inserts blocked by an uncommitted winning identity remove all losing candidate accounts", async () => {
  const before = await accountCount();
  const observer = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await observer.connect();
  let committed = false;
  let settled;
  let winningId;
  await admin.query("BEGIN");
  try {
    winningId = (await admin.query("INSERT INTO accounts DEFAULT VALUES RETURNING id")).rows[0].id;
    provisioned.add(winningId);
    await admin.query("INSERT INTO external_identities (account_id, provider, issuer, subject) VALUES ($1, $2, $3, $4)",
      [winningId, identity.provider, identity.issuer, identity.subject]);
    settled = Promise.allSettled(Array.from({ length: 4 }, () => provision()));
    let waiting = 0;
    const deadline = Date.now() + 1800;
    while (waiting !== 4 && Date.now() < deadline) {
      waiting = (await observer.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock'
        AND query LIKE '%ON CONFLICT (provider, issuer, subject) DO NOTHING%'`)).rows[0].count;
      if (waiting !== 4) await delay(10);
    }
    assert.equal(waiting, 4, "All candidates must actually reach the conflicting insert before the winner commits");
    await admin.query("COMMIT");
    committed = true;
    const results = await settled;
    assert.ok(results.every((value) => value.status === "fulfilled"));
    for (const value of results) assert.deepEqual(value.value, { id: winningId, created: false });
    assert.equal(await accountCount(), before + 1);
  } finally {
    if (!committed) await admin.query("ROLLBACK");
    await settled;
    await observer.end();
  }
});

test("explicit provisioning never reactivates an inactive mapping or replaces it with a new account", async () => {
  const first = await provision();
  await admin.query("UPDATE accounts SET state = 'deactivated' WHERE id = $1", [first.id]);
  const before = await accountCount();
  await assert.rejects(provision(), (error) => error.getStatus() === 403);
  assert.equal(await accountCount(), before);
  assert.equal((await admin.query("SELECT state FROM accounts WHERE id = $1", [first.id])).rows[0].state, "deactivated");
});

test("distinct exact provider namespaces never become a phone or subject-only merge", async () => {
  const first = await provision();
  identity = { ...identity, issuer: "https://different-issuer.example.test" };
  const second = await provision();
  assert.notEqual(second.id, first.id);
  assert.equal(second.created, true);
});

test("a failed identity insert rolls back the candidate account as well", async () => {
  const before = await accountCount();
  identity = { ...identity, provider: "" }; // Force the real database's nonempty constraint to reject the write.
  await assert.rejects(provision(), (error) => error.getStatus() === 503 && error.cause === undefined);
  assert.equal(await accountCount(), before);
});
