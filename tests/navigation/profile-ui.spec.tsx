import { userEvent } from '@testing-library/react-native';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { fetch as expoFetch } from 'expo/fetch';

import { getToken, resetIdentity, setIdentity } from './clerk';

const fetcher = jest.mocked(expoFetch);
const id = '00000000-0000-4000-8000-000000000001';
const requestId = '00000000-0000-4000-8000-000000000002';
const original = { profileId: id, displayName: 'Fixture Rider', riderType: 'bicycle', vehicleDescription: null, version: '1' };
function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  const values = { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers };
  return { status, headers: { get: (key: string) => values[key.toLowerCase() as keyof typeof values] ?? null }, json: async () => body } as Awaited<ReturnType<typeof expoFetch>>;
}
function saved(value = original, status = 200) { return response(status, value, { etag: `"profile-${id}-${value.version}"` }); }
function missing() { return response(404, { statusCode: 404, code: 'NOT_FOUND', requestId }, { 'x-request-id': requestId }); }
function bootstrap() { return response(200, { accountId: id }); }
const user = userEvent.setup();
const openButton = () => screen.getByRole('button', { name: 'Open rider details' });
const saveButton = () => screen.getByRole('button', { name: 'Save details' });

beforeEach(() => {
  resetIdentity({ isSignedIn: true });
  process.env.EXPO_PUBLIC_GROUPIFY_API_URL = 'https://api.example.invalid';
  fetcher.mockReset();
});
afterEach(() => { delete process.env.EXPO_PUBLIC_GROUPIFY_API_URL; });

async function open(result = saved()) {
  fetcher.mockResolvedValueOnce(bootstrap()).mockResolvedValueOnce(result);
  await renderRouter('./src/app', { initialUrl: '/profile' });
  await user.press(openButton());
  await screen.findByLabelText('Display name');
}

it('protects a profile deep link and discards the private route on session loss', async () => {
  resetIdentity();
  await renderRouter('./src/app', { initialUrl: '/profile' });
  expect(screen).toHavePathname('/');
  expect(fetcher).not.toHaveBeenCalled();
  expect(getToken).not.toHaveBeenCalled();
  await act(async () => { setIdentity({ isSignedIn: true }); });
  await user.press(screen.getByRole('button', { name: 'Rider details' }));
  expect(screen).toHavePathname('/profile');
  await act(async () => { setIdentity({ isSignedIn: false }); });
  await waitFor(() => { expect(screen).toHavePathname('/'); });
  expect(screen.queryByRole('button', { name: 'Open rider details' })).toBeNull();
});

it.each([undefined, 'http://api.example.invalid'])('shows unavailable configuration without token or network access (%s)', async (url) => {
  if (url === undefined) delete process.env.EXPO_PUBLIC_GROUPIFY_API_URL;
  else process.env.EXPO_PUBLIC_GROUPIFY_API_URL = url;
  await renderRouter('./src/app', { initialUrl: '/profile' });
  expect(screen.getByText(/not available in this build/)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Open rider details' })).toBeNull();
  expect(getToken).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Back to home' }));
  expect(screen).toHavePathname('/home');
});

it('requires an explicit open action, loads existing details and saves using the full current edit tag', async () => {
  fetcher.mockResolvedValueOnce(bootstrap()).mockResolvedValueOnce(saved());
  await renderRouter('./src/app', { initialUrl: '/home' });
  await user.press(screen.getByRole('button', { name: 'Rider details' }));
  expect(getToken).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  await user.press(openButton());
  expect(await screen.findByLabelText('Display name')).toHaveDisplayValue('Fixture Rider');
  expect(screen.getByRole('radio', { name: 'Bicycle' })).toBeChecked();
  expect(screen.getByText(/Profile pictures are not available yet/)).toBeVisible();
  await fireEvent.changeText(screen.getByLabelText('Display name'), 'Updated Fixture');
  fetcher.mockResolvedValueOnce(saved({ ...original, displayName: 'Updated Fixture', version: '2' }));
  await user.press(saveButton());
  expect(await screen.findByText('Details saved')).toBeVisible();
  const [url, init] = fetcher.mock.calls[2];
  expect(url).toBe('https://api.example.invalid/v1/me/profile');
  expect(init).toMatchObject({ method: 'PATCH', credentials: 'omit', redirect: 'error', headers: { 'If-Match': `"profile-${id}-1"` } });
  expect(JSON.parse(init!.body as string)).toEqual({ displayName: 'Updated Fixture', riderType: 'bicycle', vehicleDescription: '' });
  expect(getToken.mock.calls).toEqual([[], [], []]);
  await fireEvent.changeText(screen.getByLabelText('Display name'), 'Unsaved Fixture');
  expect(screen.queryByText('Details saved')).toBeNull();
});

it('creates text details only after confirmed absence and validates required fields before posting', async () => {
  await open(missing());
  expect(screen.getByLabelText('Display name')).toHaveDisplayValue('');
  expect(screen.getByRole('radio', { name: 'Motorcycle' })).not.toBeChecked();
  expect(screen.getByRole('radio', { name: 'Bicycle' })).not.toBeChecked();
  await user.press(saveButton());
  expect(screen.getByRole('alert')).toHaveTextContent(/Enter a display name/);
  expect(fetcher).toHaveBeenCalledTimes(2);
  await fireEvent.changeText(screen.getByLabelText('Display name'), 'Fixture Rider');
  await user.press(screen.getByRole('radio', { name: 'Bicycle' }));
  fetcher.mockResolvedValueOnce(saved(original, 201));
  await user.press(saveButton());
  expect(await screen.findByText('Details saved')).toBeVisible();
  expect(fetcher.mock.calls[2][1]?.method).toBe('POST');
});

it('disables duplicate opens and saves, locks editing while pending and waits for confirmed success', async () => {
  let finish!: (value: Awaited<ReturnType<typeof expoFetch>>) => void;
  fetcher.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce(saved());
  await renderRouter('./src/app', { initialUrl: '/profile' });
  await user.press(openButton());
  const opening = screen.getByRole('button', { name: 'Opening details…' });
  expect(opening).toBeDisabled();
  await fireEvent.press(opening);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => { finish(bootstrap()); });
  await screen.findByLabelText('Display name');
  fetcher.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await user.press(saveButton());
  const saving = screen.getByRole('button', { name: 'Saving details…' });
  expect(saving).toBeDisabled();
  expect(screen.getByLabelText('Display name')).toBeDisabled();
  expect(screen.getByRole('radio', { name: 'Bicycle' })).toBeDisabled();
  expect(screen.queryByText('Details saved')).toBeNull();
  await fireEvent.press(saving);
  expect(fetcher).toHaveBeenCalledTimes(3);
  await act(async () => { finish(saved({ ...original, version: '2' })); });
  expect(await screen.findByText('Details saved')).toBeVisible();
});

it.each(['conflict', 'network', 'malformed'])('preserves an unsaved draft after %s and requires explicit reload before another save', async (kind) => {
  await open();
  await fireEvent.changeText(screen.getByLabelText('Display name'), 'Unsaved Fixture');
  if (kind === 'network') fetcher.mockRejectedValueOnce(new Error('synthetic sensitive marker'));
  else fetcher.mockResolvedValueOnce(kind === 'conflict' ? response(412, {}) : response(200, {}));
  await user.press(saveButton());
  expect(screen.getByLabelText('Display name')).toHaveDisplayValue('Unsaved Fixture');
  expect(screen.getByRole('alert')).toHaveTextContent(/Reload saved details before saving again/);
  expect(screen.queryByText(/synthetic sensitive marker/)).toBeNull();
  expect(saveButton()).toBeDisabled();
  expect(screen.queryByText('Details saved')).toBeNull();
  await fireEvent.press(saveButton());
  expect(fetcher).toHaveBeenCalledTimes(3);
  fetcher.mockResolvedValueOnce(saved({ ...original, displayName: 'Latest Fixture', version: '3' }));
  await user.press(screen.getByRole('button', { name: 'Reload saved details' }));
  expect(screen.getByLabelText('Display name')).toHaveDisplayValue('Latest Fixture');
  expect(saveButton()).toBeEnabled();
  expect(fetcher.mock.calls[3][1]?.method).toBe('GET');
  expect(fetcher).toHaveBeenCalledTimes(4);
});

it('retains correctable invalid text and clears private fields on access denial', async () => {
  await open();
  await fireEvent.changeText(screen.getByLabelText('Display name'), 'Unsaved Fixture');
  fetcher.mockResolvedValueOnce(response(400, {}));
  await user.press(saveButton());
  expect(screen.getByLabelText('Display name')).toHaveDisplayValue('Unsaved Fixture');
  expect(screen.getByRole('alert')).toHaveTextContent(/up to 80 characters/);
  expect(saveButton()).toBeEnabled();
  fetcher.mockResolvedValueOnce(response(403, {}));
  await user.press(saveButton());
  expect(screen.queryByLabelText('Display name')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Open rider details' })).toBeNull();
  expect(screen.getByRole('alert')).toHaveTextContent(/account cannot access/);
});

it.each(['account', 'session'])('clears the draft on %s change and ignores a late prior-session result', async (change) => {
  await open();
  await fireEvent.changeText(screen.getByLabelText('Display name'), 'Private Fixture Draft');
  let finish!: (value: Awaited<ReturnType<typeof expoFetch>>) => void;
  fetcher.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await user.press(saveButton());
  const signal = fetcher.mock.calls[2][1]?.signal;
  await act(async () => { setIdentity(change === 'account' ? { userId: 'fixture_user_b', sessionId: 'fixture_session_b' } : { sessionId: 'fixture_session_new' }); });
  expect(signal?.aborted).toBe(true);
  expect(openButton()).toBeVisible();
  expect(screen.queryByLabelText('Display name')).toBeNull();
  await act(async () => { finish(saved({ ...original, displayName: 'Private Fixture Draft', version: '2' })); });
  expect(openButton()).toBeVisible();
  expect(screen.queryByText('Details saved')).toBeNull();
  expect(screen.queryByDisplayValue('Private Fixture Draft')).toBeNull();
});

it('aborts on navigation away and does not open the editor with incomplete identity', async () => {
  resetIdentity({ isSignedIn: true, userId: null });
  await renderRouter('./src/app', { initialUrl: '/profile' });
  expect(screen.queryByRole('button', { name: 'Open rider details' })).toBeNull();
  expect(getToken).not.toHaveBeenCalled();
  await act(async () => { setIdentity({ userId: 'fixture_user_a' }); });
  fetcher.mockImplementationOnce(() => new Promise(() => {}));
  await user.press(openButton());
  const signal = fetcher.mock.calls[0][1]?.signal;
  await user.press(screen.getByRole('button', { name: 'Back to home' }));
  expect(screen).toHavePathname('/home');
  await waitFor(() => { expect(signal?.aborted).toBe(true); });
});
