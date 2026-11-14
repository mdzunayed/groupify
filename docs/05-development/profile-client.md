# Development rider-details client

Status: implemented text-only increment, in review. This does not accept P3/P5,
R1–R4 or a complete profile. Pictures, media handling, other-rider visibility,
recovery and deletion remain unfinished. The approved profile requirement still
includes pictures; the UI does not claim completion or gate unrelated features.

## Configuration and entry

Use the pinned Node version and locked install. Copy the blank `.env.example`
and configure the development Clerk publishable key plus
`EXPO_PUBLIC_GROUPIFY_API_URL` with the trusted development API HTTPS base URL.
No credentials, query or fragment are accepted in that URL; an optional path
prefix is retained. Public environment values are bundled, so never put a secret
in either setting. Restart Expo after changes. HTTP/TLS validation is not weakened
for a local server. An appropriate HTTPS development endpoint is required.

The backend needs its separate server-only development identity configuration,
PostGIS/Redis and applied migrations; see [backend setup](../../backend/README.md)
and [the actual text API](../03-api/self-profile-text.md). It rejects disabled,
unconfigured or production identity verification. Native default-token
issuer/audience/authorized-party compatibility remains unproven: use Clerk's
default `getToken()` without selecting a JWT template or weakening verification.
The backend does not currently configure browser CORS; this Android-first task
does not silently add an origin policy or claim a working live web flow.

Home opens the protected `/profile` route. Only **Open rider details** requests
explicit account bootstrap, followed by a profile GET. Login, mounting and
navigation do not bootstrap automatically. Only a correlated JSON 404 opens an
empty form. Existing details load from the API; there is no example/default rider
or riding-type selection in product state. Missing/invalid API configuration
shows a readable unavailable state without obtaining a token.

## Editing and failure behavior

Save sends only display name, motorcycle/bicycle riding type and optional vehicle
text. Empty vehicle text clears the saved value. The API remains authoritative
for NFC/trim validation and 80/160-code-point development bounds; native UTF-16
`maxLength` is not incorrectly used as a code-point limit. Reusable fields,
buttons, Inter and approved light tokens retain scrolling and minimum 48-point
controls. Pictures are explicitly unavailable; the action is **Save details**.

Existing edits use the complete strong profile-identity/version ETag. The client
keeps bigint versions as strings, validates response shape and no-store tags,
obtains a fresh default token for each request, omits ambient cookies and rejects
redirects with the named SDK 58 `expo/fetch`. Tokens/errors are never logged or
saved by this client. No new dependency or native configuration is introduced.

Requests have a synchronous duplicate guard; edits disable while saving. A save
success appears only after a validated success response. A conflict or uncertain
mutation outcome preserves the draft and blocks another save until the rider
explicitly reloads. Reload clearly replaces unsaved text; it never retries a
write blindly. Correctable 400/415 inputs remain editable. Authentication/access
denial clears private fields. Raw server/provider/transport messages are never
shown. No timeout, automatic retry or server rollback guarantee is invented.

Changing account or session remounts the editor and discards the draft. Closing
the screen aborts outgoing work and ignores late results. An aborted client
request may already have committed on the server; returning requires a new read.
Drafts are memory-only; no sensitive profile cache or navigation parameter is
persisted.

## Evidence and remaining validation

`npm run check` includes the pure client and actual Router/UI tests with mocked
identity/HTTP. Android export checks JavaScript/assets only. These checks do not
establish live OTP/session, native TLS/fetch/cookies/cancellation, TalkBack,
keyboard, Android font scaling or physical-device behavior. A correctly configured
development identity/HTTPS API and an Android device are still needed for those
checks; never mark them passed based on fixture responses or an open port.

Before native verification, fetch SDK-matched docs per AGENTS.md. This increment
used [SDK 58](https://docs.expo.dev/versions/v58.0.0/),
[Expo fetch](https://docs.expo.dev/versions/v58.0.0/sdk/expo.md),
[protected routes](https://docs.expo.dev/router/advanced/protected.md),
[environment variables](https://docs.expo.dev/guides/environment-variables.md),
[Router tests](https://docs.expo.dev/router/reference/testing.md), RN 0.88
TextInput/ScrollView/accessibility docs and
[Clerk useAuth](https://clerk.com/docs/expo/reference/hooks/use-auth.md).
