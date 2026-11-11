# Welcome to your Expo app 👋

Groupify's existing custom phone/OTP flow uses Clerk. Its use in the current code does not establish the final OTP/SMS provider; that decision remains open. See [Authentication setup](docs/authentication.md) for the current development setup.

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   Use Node 26.13.0, as recorded in [.nvmrc](.nvmrc), then run:

   ```bash
   npm ci
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

The current app requires `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` at runtime. Copy the blank [.env.example](.env.example) to `.env` and supply a development publishable key from the configured provider. Variables prefixed `EXPO_PUBLIC_` are included in the client bundle; do not put secrets in them. The example contains no key.

## Verify the project

```bash
npm run check
```

This runs lint, TypeScript checking, and the existing automated tests. The authentication tests use mocks and do not send SMS or prove that a remote service is configured. See the [development foundation](docs/05-development/foundation.md) for environment, build, and secrets boundaries.

For an Android JavaScript and asset bundle, run `npm run bundle:android`. This does not produce an installable APK or validate native device behavior.

A NestJS backend foundation with local PostGIS and Redis setup is documented in [backend/README.md](backend/README.md). Product APIs and authentication are not implemented there yet.

A GitHub Actions workflow is prepared for the repository's GitHub origin; its first hosted run and owner review are still pending.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- The existing phone-auth tests use Node's test runner; `npm run test:auth` runs only that suite.
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
