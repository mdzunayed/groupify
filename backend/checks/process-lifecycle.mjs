import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { request } from "node:http";
import { createServer } from "node:net";
import { afterEach, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { assertDocumentedResponse } from "./api-contract.mjs";

const children = new Set();
const serverPath = fileURLToPath(new URL("../dist/main.js", import.meta.url));

async function within(promise, milliseconds = 10000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Process check timed out")), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
async function unusedPort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}
function start(port) {
  // Preserve platform network/CA settings, but isolate application credentials/data.
  const environment = { ...process.env, PORT: String(port), HOST: "127.0.0.1", NODE_ENV: "test",
    DATABASE_URL: "", REDIS_URL: "", GROUPIFY_DEV_AUTH_ENABLED: "false", GROUPIFY_DEV_WS_ENABLED: "false",
    CLERK_ISSUER: "", CLERK_AUDIENCE: "", CLERK_AUTHORIZED_PARTIES: "",
    CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: "", CLERK_JWT_KEY: "" };
  const child = spawn(process.execPath, [serverPath], { env: environment, stdio: ["ignore", "pipe", "pipe"] });
  const result = { child, stdout: "", stderr: "", closed: false };
  child.stdout.on("data", (chunk) => { result.stdout += chunk; });
  child.stderr.on("data", (chunk) => { result.stderr += chunk; });
  result.exit = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      result.closed = true;
      children.delete(result);
      resolve({ code, signal });
    });
  });
  children.add(result);
  return result;
}
function events(process) {
  return `${process.stdout}\n${process.stderr}`.split("\n").flatMap((line) => {
    try { const value = JSON.parse(line); return value.message?.event ? [value.message] : []; }
    catch { return []; }
  });
}
async function live(process, port) {
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline && !process.closed) {
    try {
      const response = await fetch(`${url}/health/live`, { signal: AbortSignal.timeout(500) });
      if (response.status === 200) return url;
    } catch { /* The child may not yet have bound its listener. */ }
    await delay(25);
  }
  throw new Error("Backend did not serve liveness before deadline");
}
afterEach(async () => {
  await Promise.all([...children].map(async (process) => {
    process.child.kill("SIGKILL");
    await within(process.exit);
  }));
});

test("the real entry point serves public probes and emits a completed SIGTERM shutdown", async () => {
  const port = await unusedPort();
  const process = start(port);
  const url = await live(process, port);
  await assertDocumentedResponse(await fetch(`${url}/health/live`), "/health/live");
  const ready = await fetch(`${url}/health/ready`);
  assert.equal(ready.status, 503);
  await assertDocumentedResponse(ready, "/health/ready");
  process.child.kill("SIGTERM");
  const exit = await within(process.exit);
  assert.ok(exit.signal === "SIGTERM" || exit.code === 0);
  assert.ok(events(process).some((event) => event.event === "http_shutdown_complete" && event.signal === "SIGTERM"));
  await assert.rejects(fetch(`${url}/health/live`, { signal: AbortSignal.timeout(500) }));
});

test("SIGTERM waits for an in-flight request before reporting HTTP disposal complete", async () => {
  const port = await unusedPort();
  const process = start(port);
  await live(process, port);
  const req = request({ hostname: "127.0.0.1", port, path: "/health/live", method: "POST", headers: {
    "Content-Type": "application/json", "Content-Length": "2", Expect: "100-continue",
  } });
  const received = new Promise((resolve, reject) => {
    req.once("error", reject);
    req.once("response", (response) => {
      let body = "";
      response.on("data", (chunk) => { body += chunk; });
      response.once("end", () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
    });
  });
  // Keep early socket errors handled while the test checks the process state.
  received.catch(() => undefined);
  try {
    const continued = once(req, "continue");
    req.flushHeaders();
    await within(continued);
    req.write("{");
    process.child.kill("SIGTERM");
    const prematureExit = await Promise.race([process.exit.then(() => true), delay(150).then(() => false)]);
    assert.equal(prematureExit, false);
    assert.ok(!events(process).some((event) => event.event === "http_shutdown_complete"));
    req.end("}");
    const response = await within(received);
    assert.equal(response.status, 404);
    assert.equal(response.body.code, "NOT_FOUND");
    await within(process.exit);
    assert.ok(events(process).some((event) => event.event === "http_shutdown_complete" && event.signal === "SIGTERM"));
  } finally {
    req.destroy();
    await received.catch(() => undefined);
  }
});

test("invalid PORT fails predictably without echoing the configured value", async () => {
  for (const port of ["synthetic-private-port-marker", "0", "65536"]) {
    const process = start(port);
    const exit = await within(process.exit);
    assert.equal(exit.code, 1);
    assert.ok(events(process).some((event) => event.event === "startup_failed" && event.reason === "invalid_port"));
    assert.ok(!`${process.stdout}${process.stderr}`.includes("synthetic-private-port-marker"));
  }
});


test("a bind failure closes application resources and reports startup failure", async () => {
  const occupied = createServer();
  occupied.listen(0, "127.0.0.1");
  await once(occupied, "listening");
  try {
    const process = start(occupied.address().port);
    const exit = await within(process.exit);
    assert.equal(exit.code, 1);
    assert.ok(events(process).some((event) => event.event === "startup_failed" && event.reason === "bootstrap_error"));
  } finally {
    await new Promise((resolve) => occupied.close(resolve));
  }
});
