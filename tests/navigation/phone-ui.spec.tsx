import { userEvent } from '@testing-library/react-native';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { resetIdentity, signInResource, signUpResource } from './clerk';

type Mode = 'sign-in' | 'sign-up';
const modes: Mode[] = ['sign-in', 'sign-up'];
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
const digit = (index: number) => screen.getByLabelText(`OTP digit ${index}`);
const verifyButton = () => screen.getByRole('button', { name: 'Verify & Continue' });

beforeEach(() => { jest.useFakeTimers(); resetIdentity(); });
afterEach(() => { jest.useRealTimers(); });

async function openPhone(mode: Mode) {
  await renderRouter('./src/app');
  await user.press(screen.getByRole('button', { name: 'Continue to welcome' }));
  await user.press(screen.getByRole('button', {
    name: mode === 'sign-up' ? 'Get started' : 'Already have an account? Log in',
  }));
  // Reserved fictional US number; fixture calls never reach a provider.
  await fireEvent.changeText(screen.getByLabelText('Country calling code'), '+1');
  await fireEvent.changeText(screen.getByLabelText('Phone number'), '202 555 0123');
}
async function sendCode() {
  await user.press(screen.getByRole('button', { name: 'Send OTP' }));
  await screen.findByText('Enter OTP');
}
function resource(mode: Mode) { return mode === 'sign-in' ? signInResource : signUpResource; }
function send(mode: Mode) { return mode === 'sign-in' ? signInResource.phoneCode.sendCode : signUpResource.verifications.sendPhoneCode; }
function verify(mode: Mode) { return mode === 'sign-in' ? signInResource.phoneCode.verifyCode : signUpResource.verifications.verifyPhoneCode; }

it('rejects invalid phone input before any provider operation', async () => {
  await openPhone('sign-in');
  await fireEvent.changeText(screen.getByLabelText('Phone number'), 'invalid');
  await user.press(screen.getByRole('button', { name: 'Send OTP' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/Enter a valid phone number/);
  expect(signInResource.phoneCode.sendCode).not.toHaveBeenCalled();
  expect(signUpResource.create).not.toHaveBeenCalled();
});

it.each(modes)('completes %s through OTP verification and session activation', async (mode) => {
  await openPhone(mode);
  await sendCode();
  if (mode === 'sign-in') expect(send(mode)).toHaveBeenCalledWith({ phoneNumber: '+12025550123' });
  else expect(signUpResource.create).toHaveBeenCalledWith({ phoneNumber: '+12025550123' });
  expect(verifyButton()).toBeDisabled();
  await fireEvent.changeText(digit(1), '123456');
  for (let index = 1; index <= 6; index++) expect(digit(index)).toHaveDisplayValue(String(index));
  expect(resource(mode).finalize).not.toHaveBeenCalled();
  await user.press(verifyButton());
  expect(verify(mode)).toHaveBeenCalledWith({ code: '123456' });
  expect(resource(mode).finalize).toHaveBeenCalledTimes(1);
  await waitFor(() => { expect(screen).toHavePathname('/home'); });
});

it('disables editing and duplicate sends until the pending request settles', async () => {
  await openPhone('sign-in');
  let finish!: (result: { error: null }) => void;
  signInResource.phoneCode.sendCode.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await user.press(screen.getByRole('button', { name: 'Send OTP' }));
  const busy = screen.getByRole('button', { name: 'Sending code…' });
  expect(busy).toBeDisabled();
  expect(screen.getByLabelText('Phone number')).toBeDisabled();
  expect(screen.getByLabelText('Country calling code')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled();
  await user.press(busy);
  expect(signInResource.phoneCode.sendCode).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ error: null }); });
  expect(screen.getByText('Enter OTP')).toBeVisible();
});

it.each(modes)('shows a %s send failure and permits retry', async (mode) => {
  await openPhone(mode);
  send(mode).mockResolvedValueOnce({ error: new Error('Test SMS unavailable') });
  await user.press(screen.getByRole('button', { name: 'Send OTP' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Test SMS unavailable');
  expect(screen.getByLabelText('Phone number')).toBeEnabled();
  await sendCode();
  expect(send(mode)).toHaveBeenCalledTimes(2);
});

it.each(modes)('keeps %s verification failures on OTP and permits retry', async (mode) => {
  await openPhone(mode); await sendCode();
  verify(mode).mockResolvedValueOnce({ error: new Error('Test incorrect code') });
  await fireEvent.changeText(digit(1), '123456');
  await user.press(verifyButton());
  expect(screen.getByRole('alert')).toHaveTextContent('Test incorrect code');
  expect(resource(mode).finalize).not.toHaveBeenCalled();
  expect(screen).toHavePathname('/');
  await fireEvent.changeText(digit(1), '654321');
  await user.press(verifyButton());
  await waitFor(() => { expect(screen).toHavePathname('/home'); });
});

it('requires all six digits after clearing a previously pasted code', async () => {
  await openPhone('sign-in'); await sendCode();
  await fireEvent.changeText(digit(4), '123456');
  await fireEvent.changeText(digit(6), '');
  expect(verifyButton()).toBeDisabled();
  await user.press(verifyButton());
  expect(signInResource.phoneCode.verifyCode).not.toHaveBeenCalled();
  await fireEvent.changeText(digit(6), '9');
  await user.press(verifyButton());
  expect(signInResource.phoneCode.verifyCode).toHaveBeenCalledWith({ code: '123459' });
});

it('blocks early resend, then resets digits and cooldown after a successful resend', async () => {
  await openPhone('sign-in'); await sendCode();
  await fireEvent.changeText(digit(1), '123456');
  const cooldown = screen.getByRole('button', { name: 'Resend code in 30 seconds' });
  expect(cooldown).toBeDisabled(); await user.press(cooldown);
  expect(signInResource.phoneCode.sendCode).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(30_000); });
  await user.press(screen.getByRole('button', { name: 'Resend code' }));
  expect(signInResource.phoneCode.sendCode).toHaveBeenLastCalledWith();
  expect(signInResource.phoneCode.sendCode).toHaveBeenCalledTimes(2);
  for (let index = 1; index <= 6; index++) expect(digit(index)).toHaveDisplayValue('');
  expect(verifyButton()).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Resend code in 30 seconds' })).toBeDisabled();
});

it('retains the phone number but clears OTP when returning to phone entry', async () => {
  await openPhone('sign-in'); await sendCode();
  await fireEvent.changeText(digit(1), '123456');
  await user.press(screen.getByRole('button', { name: 'Go back' }));
  expect(screen.getByLabelText('Phone number')).toHaveDisplayValue('202 555 0123');
  await sendCode();
  expect(verifyButton()).toBeDisabled();
  expect(digit(1)).toHaveDisplayValue('');
});

it('keeps incomplete verification on OTP without activating a session', async () => {
  await openPhone('sign-in'); await sendCode();
  signInResource.status = 'needs_second_factor';
  await fireEvent.changeText(digit(1), '123456');
  await user.press(verifyButton());
  expect(screen.getByRole('alert')).toHaveTextContent(/additional verification/);
  expect(signInResource.finalize).not.toHaveBeenCalled();
  expect(screen).toHavePathname('/');
  expect(digit(1)).toHaveDisplayValue('1');
});

it('shows finalization failure without opening home, then permits retry', async () => {
  await openPhone('sign-in'); await sendCode();
  signInResource.finalize.mockResolvedValueOnce({ error: new Error('Test activation failure') });
  await fireEvent.changeText(digit(1), '123456');
  await user.press(verifyButton());
  expect(screen.getByRole('alert')).toHaveTextContent('Test activation failure');
  expect(screen).toHavePathname('/');
  expect(screen.queryByText('Rides are coming')).toBeNull();
  await user.press(verifyButton());
  await waitFor(() => { expect(screen).toHavePathname('/home'); });
});
