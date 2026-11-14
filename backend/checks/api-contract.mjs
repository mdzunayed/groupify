import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validators = new WeakMap();
let contractPromise;

export function loadContract() {
  contractPromise ??= (async () => {
    const document = JSON.parse(await readFile(new URL("../../docs/03-api/openapi.json", import.meta.url), "utf8"));
    // Contract validation must not fetch external documents or require a network.
    return SwaggerParser.validate(document, { resolve: { external: false } });
  })();
  return contractPromise;
}

function validate(schema, value, label) {
  let check = validators.get(schema);
  if (!check) {
    check = ajv.compile(schema);
    validators.set(schema, check);
  }
  assert.ok(check(value), `${label} violates OpenAPI: ${ajv.errorsText(check.errors)}`);
}

async function assertResponse(response, responseContract) {
  for (const [name, header] of Object.entries(responseContract.headers ?? {})) {
    const value = response.headers.get(name);
    if (header.required) assert.notEqual(value, null, `Missing ${name} header`);
    if (value !== null) validate(header.schema, value, name);
  }
  if (!responseContract.content) {
    assert.equal(await response.clone().text(), "", "Bodyless response must be empty");
    return null;
  }
  assert.match(response.headers.get("content-type") ?? "", /^application\/json(?:\s*;|$)/i);
  const body = await response.clone().json();
  validate(responseContract.content["application/json"].schema, body, "Response body");
  if (response.status >= 400) {
    assert.equal(body.statusCode, response.status, "Body status must equal HTTP status");
    assert.equal(body.requestId, response.headers.get("x-request-id"), "Body ID must equal header ID");
  }
  return body;
}

export async function assertDocumentedResponse(response, path, method = "get") {
  const document = await loadContract();
  const operation = document.paths[path]?.[method];
  assert.ok(operation, `Undocumented operation: ${method.toUpperCase()} ${path}`);
  const responseContract = operation.responses[String(response.status)] ?? operation.responses.default;
  assert.ok(responseContract, `Undocumented response status: ${response.status}`);
  return assertResponse(response, responseContract);
}

export async function assertSharedErrorResponse(response) {
  assert.ok(response.status >= 400 && response.status <= 599);
  const document = await loadContract();
  return assertResponse(response, document.components.responses.HttpError);
}
