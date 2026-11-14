// A noncredential marker: Clerk is entirely mocked in this suite.
process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = 'fixture_only_not_a_real_key';

jest.mock('@clerk/expo', () => require('./clerk'));
jest.mock('@clerk/expo/token-cache', () => ({ tokenCache: {} }));
jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: jest.fn(() => [true, null]),
}));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
