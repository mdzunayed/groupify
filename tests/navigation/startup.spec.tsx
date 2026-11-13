import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';

import { providerRendered, resetIdentity } from './clerk';

beforeEach(() => { resetIdentity(); jest.mocked(useFonts).mockReturnValue([true, null]); });

it('keeps the provider and routes unmounted while fonts load', async () => {
  jest.mocked(useFonts).mockReturnValue([false, null]);
  await renderRouter('./src/app', { initialUrl: '/home' });
  expect(screen.getByText('Loading Groupify')).toBeVisible();
  expect(screen.getByText('Preparing the app…')).toBeBusy();
  expect(providerRendered).not.toHaveBeenCalled();
  expect(screen.queryByText('Rides are coming')).toBeNull();
});

it('shows an actionable font error without mounting identity or routes', async () => {
  jest.mocked(useFonts).mockReturnValue([false, new Error('Test font failure')]);
  await renderRouter('./src/app', { initialUrl: '/home' });
  expect(screen.getByRole('alert')).toHaveTextContent(/Please restart Groupify/);
  expect(providerRendered).not.toHaveBeenCalled();
  expect(screen.queryByText('Rides are coming')).toBeNull();
});
