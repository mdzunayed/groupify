import { request } from "node:http";

// Fetch implementations can add Cache-Control: no-cache for conditional requests,
// masking Express's normal conditional response. Send exactly the fixture headers.
export function rawGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = request(url, { method: "GET", headers }, (incoming) => {
      const chunks = [];
      incoming.on("data", (chunk) => chunks.push(chunk));
      incoming.on("error", reject);
      incoming.on("end", () => {
        const headers = new Headers();
        for (let index = 0; index < incoming.rawHeaders.length; index += 2) headers.append(incoming.rawHeaders[index], incoming.rawHeaders[index + 1]);
        const body = Buffer.concat(chunks);
        resolve(new Response(body.length ? body : null, { status: incoming.statusCode, headers }));
      });
    });
    outgoing.on("error", reject);
    outgoing.end();
  });
}
