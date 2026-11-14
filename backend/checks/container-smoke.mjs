import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

import { assertDocumentedResponse } from "./api-contract.mjs";

const execute = promisify(execFile);
const directory = fileURLToPath(new URL("../", import.meta.url));
const image = `groupify-backend-check:${randomUUID()}`;
const network = process.env.GROUPIFY_CONTAINER_TEST_NETWORK;
let built = false;
let container;
async function docker(...args) {
  return (await execute("docker", args, { cwd: directory, maxBuffer: 16 * 1024 * 1024 })).stdout.trim();
}
async function reachable(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/health/live`, { signal: AbortSignal.timeout(1000) });
      if (response.status === 200) return;
    } catch { /* The test-owned process may still be starting. */ }
    await delay(100);
  }
  throw new Error("Test container did not serve liveness before the fixture deadline");
}
try {
  const networkArguments = [];
  let runtimeEnvironment;
  if (network !== undefined) {
    assert.ok(process.env.GROUPIFY_TEST_DISPOSABLE_DATABASE === "true", "Store-wiring mode requires an explicitly disposable fixture");
    assert.ok(/^groupify-test-[a-f0-9]{16}_default$/.test(network), "Store-wiring mode accepts only the owned integration network");
    let database;
    let redis;
    try { database = new URL(process.env.DATABASE_URL); redis = new URL(process.env.REDIS_URL); }
    catch { throw new Error("Store-wiring fixture URLs are invalid"); }
    assert.ok(["postgres:", "postgresql:"].includes(database.protocol) && database.hostname === "127.0.0.1" && database.pathname === "/groupify",
      "Store-wiring mode requires the runner's loopback database fixture");
    assert.ok(process.env.POSTGRES_PASSWORD && database.username === "groupify" && database.password === process.env.POSTGRES_PASSWORD,
      "Store-wiring database credentials must match the owned fixture");
    assert.ok(redis.protocol === "redis:" && redis.hostname === "127.0.0.1" && !redis.username && !redis.password,
      "Store-wiring mode requires the runner's loopback Redis fixture");
    const labels = JSON.parse(await docker("network", "inspect", "--format", "{{json .Labels}}", network));
    assert.ok(labels?.["com.docker.compose.project"] === network.slice(0, -"_default".length), "Owned Compose project labels must match");
    database.hostname = "database"; database.port = "5432";
    redis.hostname = "redis"; redis.port = "6379";
    runtimeEnvironment = { ...process.env, DATABASE_URL: database.toString(), REDIS_URL: redis.toString() };
    // Values stay in the child environment, never command arguments or logs.
    networkArguments.push("--network", network, "--env", "DATABASE_URL", "--env", "REDIS_URL");
  }
  await new Promise((resolve, reject) => {
    const build = spawn("docker", ["build", "--tag", image, "."], { cwd: directory, stdio: "inherit" });
    build.on("error", reject);
    build.on("exit", (code) => code === 0 ? resolve() : reject(new Error("Backend image build failed")));
  });
  built = true;
  // Default mode has no stores. The explicit owned-fixture mode supplies only
  // its internal store URLs; provider keys and host account data stay absent.
  const run = await execute("docker", ["run", "--detach", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
    "--publish", "127.0.0.1::3000", "--env", "GROUPIFY_DEV_AUTH_ENABLED=true", "--env", "GROUPIFY_DEV_WS_ENABLED=true",
    "--env", "GROUPIFY_DEV_COMMUNITY_CREATION_ENABLED=true", ...networkArguments, image],
  { cwd: directory, maxBuffer: 16 * 1024 * 1024, ...(runtimeEnvironment ? { env: runtimeEnvironment } : {}) });
  container = run.stdout.trim();
  const ports = JSON.parse(await docker("inspect", "--format", "{{json .NetworkSettings.Ports}}", container));
  const port = ports["3000/tcp"][0];
  assert.equal(port.HostIp, "127.0.0.1");
  const url = `http://127.0.0.1:${port.HostPort}`;
  await reachable(url);
  const nodeVersion = await docker("exec", container, "node", "--version");
  assert.equal(nodeVersion, `v${(await readFile(new URL("../../.nvmrc", import.meta.url), "utf8")).trim()}`);
  const uid = await docker("exec", container, "node", "-p", "process.getuid()");
  assert.match(uid, /^[1-9][0-9]*$/);
  assert.equal(await docker("exec", container, "node", "-p", "process.env.NODE_ENV"), "production");
  const healthCommand = JSON.parse(await docker("inspect", "--format", "{{json .Config.Healthcheck.Test}}", container));
  assert.equal(healthCommand[0], "CMD");
  await docker("exec", container, ...healthCommand.slice(1));
  assert.equal(await docker("exec", container, "node", "-p", "require('node:fs').existsSync('/app/node_modules/typescript')"), "false");
  assert.equal(await docker("exec", container, "node", "-p", "require('node:fs').existsSync('/app/checks')"), "false");
  const migrationNames = JSON.parse(await docker("exec", container, "node", "-p", "JSON.stringify(require('node:fs').readdirSync('/app/migrations').sort())"));
  assert.deepEqual(migrationNames, (await readdir(new URL("../migrations", import.meta.url))).sort());
  const live = await fetch(`${url}/health/live`);
  assert.equal(live.status, 200);
  await assertDocumentedResponse(live, "/health/live");
  const ready = await fetch(`${url}/health/ready`);
  assert.equal(ready.status, network === undefined ? 503 : 200);
  await assertDocumentedResponse(ready, "/health/ready");
  const community = "11111111-1111-4111-8111-111111111111";
  const ride = "22222222-2222-4222-8222-222222222222";
  for (const [path, method, body, documentedPath = path] of [["/v1/accounts/bootstrap", "POST", {}], ["/v1/me/profile", "GET", undefined],
    ["/v1/communities", "POST", { name: "container-fixture-private-marker" }],
    [`/v1/communities/${community}/rides`, "POST", { mode: "immediate" }, "/v1/communities/{communityId}/rides"],
    ...["start", "end"].map((action) => [`/v1/communities/${community}/rides/${ride}/${action}`, "POST", {}, `/v1/communities/{communityId}/rides/{rideId}/${action}`])]) {
    const response = await fetch(`${url}${path}`, { method, headers: { Authorization: "Bearer container-fixture-private-marker", "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    assert.equal(response.status, 503);
    assert.ok(!JSON.stringify(await assertDocumentedResponse(response, documentedPath, method.toLowerCase())).includes("container-fixture-private-marker"));
  }
  await docker("stop", "--time", "10", container);
  const stopped = JSON.parse(await docker("inspect", "--format", "{{json .State}}", container));
  // Nest disposes HTTP and can re-raise SIGTERM; Docker represents that as143.
  // Match the existing real-process proof rather than requiring a zero exit.
  assert.ok([0, 143].includes(stopped.ExitCode));
  assert.equal(stopped.OOMKilled, false);
  assert.equal(stopped.Error, "");
  const captured = await execute("docker", ["logs", container], { cwd: directory, maxBuffer: 16 * 1024 * 1024 });
  const logs = captured.stdout + captured.stderr;
  assert.match(logs, /http_shutdown_complete/);
  assert.ok(!logs.includes("container-fixture-private-marker"));
  if (network !== undefined) assert.ok(!logs.includes(process.env.POSTGRES_PASSWORD), "Fixture store credentials must stay out of image logs");
  console.log(JSON.stringify({ event: "container_smoke_passed", nodeVersion, nonRoot: true, readOnly: true,
    compilerOmitted: true, migrations: migrationNames.length, readiness: ready.status,
    stores: network === undefined ? "unconfigured" : "owned-compose-fixture",
    productionDevelopmentFlagsDenied: true, shutdown: "clean", exitCode: stopped.ExitCode }));
} finally {
  // Remove only the UUID-named image and exact container created by this test.
  if (container) await docker("rm", "--force", container).catch(() => console.error("Owned container cleanup failed"));
  if (built) await docker("image", "rm", image).catch(() => console.error("Owned image cleanup failed"));
}
