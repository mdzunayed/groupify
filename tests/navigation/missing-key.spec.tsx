import { renderRouter, screen } from 'expo-router/testing-library';

import { providerRendered, resetIdentity } from './clerk';

// Separate Jest module environment: the root captures configuration on import.
beforeAll(() => { delete process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY; });
beforeEach(() => { resetIdentity(); });

it('renders unavailable sign-in instead of mounting Clerk when the key is absent', async () => {
  await renderRouter('./src/app', { initialUrl: '/home' });
  expect(screen.getByText('Sign-in is unavailable')).toBeVisible();
  expect(screen.getByRole('alert')).toHaveTextContent(/This installation is not ready/);
  expect(providerRendered).not.toHaveBeenCalled();
  expect(screen.queryByText('Rides are coming')).toBeNull();
});
