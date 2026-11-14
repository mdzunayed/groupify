# Backend container artifact

Status: P4 packaging increment in review. No hosting provider, registry publishing,
deployment, production identity or operational policy is selected. In production
mode the current development identity, community preview and diagnostic WebSocket
remain unavailable; the artifact can serve the public health foundation.

`backend/Dockerfile` builds TypeScript with locked development dependencies and
copies only compiled runtime code, separately installed locked production
dependencies, package metadata and migrations into the final stage. It uses the
official Node26.13.0-bookworm-slim multi-architecture index pinned to
`sha256:add5c17c14752c54d2f3d519ec46a3815684d41c33f198bcb09fb998f7dcbf68`.
Registry manifest inspection confirmed this digest and linux/amd64/arm64 metadata;
only the actually executed CI architecture is verification evidence. No TLS or
integrity check is disabled. Update both the Node pin and reviewed digest together
when changing runtime versions; the smoke check compares runtime Node to .nvmrc.

The final stage uses the existing non-root node user, NODE_ENV=production,
PORT=3000 and HOST=0.0.0.0 inside the container. The host source process still
defaults to loopback; the image-specific host setting enables container port
forwarding. Probe port publication in the test is loopback-only and ephemeral.
No service is deployed or externally published by the smoke check.

The build-context allowlist excludes environment files, local node_modules,
compiled output, tests and other files outside the explicit source/migration/
package/compiler inputs. Runtime excludes compiler/test code. No key is passed
as a build argument or baked into a layer. Default smoke mode supplies no stores;
the explicitly marked store mode supplies only its own generated fixture URLs.
Supply actual server configuration through supported environment settings only
when the relevant environment/action is authorized; never put it in this image.

From the repository root, build a review image with:

```sh
docker build --tag groupify-backend:review backend
```

No database/Redis is bundled. Readiness fails503 until actual dependency and
applied-migration-name checks pass. Migrations are packaged at the expected path,
but startup never applies them automatically. Shared-data migration/rollback,
backup, secrets, TLS/proxy, resource/drain limits, health cadence, OS/package
security, image scanning and deployment remain their separate operational work;
base pinning and a passing smoke test do not settle those decisions.

## Container verification

Run `npm --prefix backend run test:container` with Docker available. The check
builds a UUID-named local image, starts its own non-root/read-only container with
all capabilities dropped/no-new-privileges and no host credentials/data stores,
and executes the actual image's HTTP service. It verifies:

- exact pinned Node version, nonzero UID, production default and absence of
  compiler/test directories;
- packaged migration names and execution of the image's own liveness command;
- real documented200 liveness and503 unconfigured readiness responses;
- safe503 bootstrap/self-profile/community responses even when all three
  development flags are explicitly enabled under production mode;
- clean SIGTERM disposal/exit and absence of a synthetic request marker from
  combined stdout/stderr logs.

Only its exact container ID and UUID image tag are removed; no unrelated image,
volume, cache or container is pruned. This check is an added CI step. The existing
64-case real PostGIS/Redis/HTTP/WebSocket integration remains a separate suite.
No real provider secret, OTP, private profile or device is used by the fixture.

## Owned store-wiring mode

After the serial integration suite, the Docker runner invokes the same image
check with its unique Compose network. This mode requires the disposable marker,
the exact integration-network naming pattern and matching Compose ownership label,
the primary loopback fixture URLs, and the same generated database credential.
Unmarked, unrelated or malformed settings refuse before any Docker build or data
store access. Invalid URL errors do not reflect their original strings.

Only the fixture URL hosts/ports are translated to internal database/Redis service
names. The two URLs reach Docker through the child environment and key-only env
arguments; credentials are never command arguments, image layers or log fields.
Combined image logs are checked for the generated password as well as the synthetic
request marker. Host provider keys/accounts are not forwarded.

This second actual-image mode requires documented readiness200 using real
PostGIS/Redis and the applied migrations, while the standalone unconfigured mode
still requires503. Both retain production-mode development API denial, non-root/
read-only execution and clean shutdown checks. The existing Compose fixture and
image cleanup own all resources; no production network/service is added. This
proves the particular image's fixture wiring only after hosted execution, not
production TLS, provider identity, backup/restore or deployment readiness.

Local image execution remains blocked by the managed Docker daemon's existing
VFS storage problem. Registry manifest inspection succeeds without downloading
layers; an unchanged layer-extraction failure was not retried, and no daemon
reconfiguration/pruning was attempted. Actual image build/start/HTTP/shutdown
evidence must come from the hosted run and is recorded in implementation status
and the tracker. Local unit/HTTP results alone cannot substitute for it.

Reference: [Docker build guidance](https://docs.docker.com/build/building/best-practices/)
and [backend module boundaries](../01-architecture/backend-modules.md).
