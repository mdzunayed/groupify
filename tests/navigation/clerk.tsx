import { useSyncExternalStore, type ReactNode } from 'react';

type Identity = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  sessionId: string | null;
  session: null | { status?: string; currentTask?: { key: string } };
};
const initial: Identity = { isLoaded: true, isSignedIn: false, session: null, userId: null, sessionId: null };
let identity = initial;
const listeners = new Set<() => void>();

export function setIdentity(next: Partial<Identity>) {
  if (next.isSignedIn === true) next = { userId: 'fixture_user_a', sessionId: 'fixture_session_a', ...next };
  if (next.isSignedIn === false) next = { userId: null, sessionId: null, ...next };
  identity = { ...identity, ...next };
  listeners.forEach((listener) => listener());
}

function useIdentity() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => identity,
  );
}

export const signOut = jest.fn<Promise<void>, []>();
export const getToken = jest.fn<Promise<string | null>, []>();
type Outcome = { error: unknown | null };
function phoneResource() {
  return {
    status: 'complete',
    missingFields: [] as string[],
    create: jest.fn<Promise<Outcome>, [{ phoneNumber: string }]>(async () => ({ error: null })),
    phoneCode: {
      sendCode: jest.fn<Promise<Outcome>, [{ phoneNumber?: string }?]>(async () => ({ error: null })),
      verifyCode: jest.fn<Promise<Outcome>, [{ code: string }]>(async () => ({ error: null })),
    },
    verifications: {
      sendPhoneCode: jest.fn<Promise<Outcome>, []>(async () => ({ error: null })),
      verifyPhoneCode: jest.fn<Promise<Outcome>, [{ code: string }]>(async () => ({ error: null })),
    },
    finalize: jest.fn<Promise<Outcome>, []>(async () => {
      setIdentity({ isSignedIn: true });
      return { error: null };
    }),
  };
}
export let signInResource = phoneResource();
export let signUpResource = phoneResource();
export const providerRendered = jest.fn();

export function resetIdentity(next: Partial<Identity> = {}) {
  signInResource = phoneResource();
  signUpResource = phoneResource();
  identity = { ...initial, ...(next.isSignedIn ? { userId: 'fixture_user_a', sessionId: 'fixture_session_a' } : {}), ...next };
  getToken.mockReset();
  getToken.mockResolvedValue('fixture_only_not_a_credential');
  signOut.mockReset();
  signOut.mockImplementation(async () => {
    setIdentity({ isSignedIn: false, session: null });
  });
}

export function ClerkProvider({ children }: { children: ReactNode }) {
  providerRendered();
  return children;
}
export const useAuth = () => ({ ...useIdentity(), getToken });
export const useSession = () => ({ session: useIdentity().session });
export const useUser = () => ({ user: { firstName: 'Test Rider' } });
export const useClerk = () => ({ signOut });
export const useSignIn = () => ({ signIn: signInResource });
export const useSignUp = () => ({ signUp: signUpResource });
