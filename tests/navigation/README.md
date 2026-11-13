# Authentication and protected-navigation integration tests

Run with the pinned Node version and locked dependencies:

```sh
npm ci
npm run test:navigation
```

`npm run check` includes this suite as well as lint, TypeScript and the existing
Node tests. The existing GitHub Actions job already runs that command. Tests live
outside `src/app`, so Expo Router never discovers them as product routes.

The SDK 58 `jest-expo` preset and React Native Testing Library 14 run
`expo-router/testing-library` against the actual `src/app` directory, including
its root layout, screens and `Stack.Protected`. Neither Router nor its guards
are mocked. The suite covers:

- signed-out `/home` deep links redirecting to `/`;
- existing signed-in sessions entering from `/` and `/home`;
- authentication/session-loss transitions removing inaccessible history;
- session loading preventing home from rendering;
- pending sessions and outstanding tasks preventing home access;
- sign-out busy/disabled behavior, duplicate presses, failure and successful retry.

`clerk.tsx` supplies a reactive, in-memory identity and sign-out function. The
setup mocks Clerk/token storage, loaded fonts and native safe-area measurements.
Phone send/verify/finalize responses are controllable Jest mocks; successful fixture finalization updates only the in-memory identity. No real key, SMS, private
profile or remote session is used; the publishable-key value is a noncredential
marker. The fixture is imported only by Jest setup/tests and is not a production
authentication bypass.

These tests prove JavaScript routing with mocked identity. They do not validate
Clerk configuration, native lifecycle/session persistence, physical-device
navigation, autofill, background behavior or backend authorization. Add product
routes here only when their behavior is implemented and authorized.


The phone UI suite covers both sign-in and sign-up through the actual screen and
Router: invalid phone rejection, normalized provider parameters, pending-send
editing/duplicate controls, send/verification failure and retry, six-digit paste
callbacks and incomplete-code gating, resend cooldown/clearing, return-to-phone
state, incomplete verification, and failed session activation. Fake clocks advance
the 30-second resend delay; no real-time wait, SMS or actual OTP is involved.
The fictional phone number uses the reserved US 202-555-0123 range.

Startup suites cover font loading, font errors and missing publishable-key
configuration while asserting that Clerk never mounts. The missing-key case runs
in its own Jest module environment because the root captures configuration when
it is imported. Font responses are mocked rather than dependent on native loading.
These renderer tests do not establish physical keyboard/autofill/ref-focus behavior,
large-text layout or screen-reader announcements; retain the separate browser and
Android validation procedures for that evidence.
