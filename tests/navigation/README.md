# Protected navigation integration tests

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
Phone operations are unavailable in this fixture. No real key, SMS, private
profile or remote session is used; the publishable-key value is a noncredential
marker. The fixture is imported only by Jest setup/tests and is not a production
authentication bypass.

These tests prove JavaScript routing with mocked identity. They do not validate
Clerk configuration, native lifecycle/session persistence, physical-device
navigation, autofill, background behavior or backend authorization. Add product
routes here only when their behavior is implemented and authorized.
