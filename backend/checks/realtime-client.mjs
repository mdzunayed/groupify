import { once } from "node:events";
import WebSocket from "ws";

export async function within(promise, milliseconds = 3000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("WebSocket check timed out")), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

export function connect(baseUrl, options = {}) {
  const { path = "/v1/development/events", headers = {} } = options;
  const authorization = Object.hasOwn(options, "authorization") ? options.authorization : "Bearer fixture-only-marker";
  const peer = new WebSocket(`${baseUrl.replace(/^http/, "ws")}${path}`, {
    headers: { ...(authorization === undefined ? {} : { Authorization: authorization }), ...headers },
  });
  peer.on("error", () => undefined);
  const opened = once(peer, "open");
  opened.catch(() => undefined);
  const upgraded = once(peer, "upgrade");
  upgraded.catch(() => undefined);
  const initial = nextFrame(peer);
  initial.catch(() => undefined);
  const closed = new Promise((resolve) => peer.once("close", (code, reason) => resolve({ code, reason: reason.toString() })));
  const rejected = new Promise((resolve, reject) => peer.once("unexpected-response", (_request, response) => {
    let body = "";
    response.on("data", (chunk) => { body += chunk; });
    response.once("end", () => {
      resolve(new Response(body, { status: response.statusCode, headers: response.headers }));
      peer.terminate();
    });
    response.once("aborted", () => reject(new Error("Upgrade response aborted")));
  }));
  rejected.catch(() => undefined);
  return { peer, opened, upgraded, initial, closed, rejected };
}

export async function nextFrame(peer) {
  const [data] = await once(peer, "message");
  return JSON.parse(data.toString());
}

export async function terminate(clients) {
  for (const client of clients) client.peer.terminate();
  await within(Promise.all([...clients].map((client) => client.closed)));
}
