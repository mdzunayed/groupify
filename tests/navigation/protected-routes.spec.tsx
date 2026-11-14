import { userEvent } from "@testing-library/react-native";
import { act, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { resetIdentity, setIdentity, signOut } from './clerk';

beforeEach(() => { resetIdentity(); });
const user = userEvent.setup();

it('redirects a signed-out home deep link to the public route', async () => {
  await renderRouter('./src/app', { initialUrl: '/home' });
  expect(screen).toHavePathname('/');
  expect(screen.queryByText('Rides are coming')).toBeNull();
  expect(screen.getByRole('button', { name: 'Continue to welcome' })).toBeVisible();
});

it.each(['/', '/home'])('opens home for an existing signed-in session from %s', async (initialUrl) => {
  resetIdentity({ isSignedIn: true });
  await renderRouter('./src/app', { initialUrl });
  expect(screen).toHavePathname('/home');
  expect(screen.getByText('Rides are coming')).toBeVisible();
});

it('removes the public route after authentication and home after session loss', async () => {
  await renderRouter('./src/app');
  await act(async () => { setIdentity({ isSignedIn: true }); });
  await waitFor(() => { expect(screen).toHavePathname('/home'); });
  expect(screen.getByText('Rides are coming')).toBeVisible();
  await act(async () => { setIdentity({ isSignedIn: false }); });
  await waitFor(() => { expect(screen).toHavePathname('/'); });
  expect(screen.queryByText('Rides are coming')).toBeNull();
  expect(screen).toHaveRouterState(expect.objectContaining({
    routes: [expect.objectContaining({ state: expect.objectContaining({
      routes: [expect.objectContaining({ name: 'index' })],
    }) })],
  }));
});

it('keeps home hidden while the session is loading', async () => {
  resetIdentity({ isLoaded: false, isSignedIn: true });
  await renderRouter('./src/app', { initialUrl: '/home' });
  expect(screen.getByText('Loading your session')).toBeVisible();
  expect(screen.queryByText('Rides are coming')).toBeNull();
  await act(async () => { setIdentity({ isLoaded: true }); });
  await waitFor(() => { expect(screen).toHavePathname('/home'); });
});

it.each([
  { status: 'pending' },
  { status: 'active', currentTask: { key: 'test-task' } },
])('blocks home when account setup is required: %j', async (session) => {
  resetIdentity({ isSignedIn: true, session });
  await renderRouter('./src/app', { initialUrl: '/home' });
  expect(screen.getByText('One more step is needed')).toBeVisible();
  expect(screen.queryByText('Rides are coming')).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => { expect(screen).toHavePathname('/'); });
  expect(signOut).toHaveBeenCalledTimes(1);
});

it('retains home on failed sign-out and redirects only after a successful retry', async () => {
  resetIdentity({ isSignedIn: true });
  let rejectSignOut!: (cause: Error) => void;
  signOut.mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectSignOut = reject; }));
  await renderRouter('./src/app', { initialUrl: '/home' });
  await user.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(screen.getByRole('button', { name: 'Signing out…' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Signing out…' }));
  expect(signOut).toHaveBeenCalledTimes(1);
  expect(screen).toHavePathname('/home');
  await act(async () => { rejectSignOut(new Error('synthetic_sensitive_marker')); });
  expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t complete that request. Please try again.');
  expect(screen.queryByText(/synthetic_sensitive_marker/)).toBeNull();
  expect(screen).toHavePathname('/home');
  await user.press(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => { expect(screen).toHavePathname('/'); });
  expect(signOut).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Rides are coming')).toBeNull();
});
