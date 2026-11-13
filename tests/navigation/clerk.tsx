import { useSyncExternalStore, type ReactNode } from 'react';

type Identity = {
  isLoaded: boolean;
  isSignedIn: boolean;
  session: null | { status?: string; currentTask?: { key: string } };
};
const initial: Identity = { isLoaded: true, isSignedIn: false, session: null };
let identity = initial;
const listeners = new Set<() => void>();

export function setIdentity(next: Partial<Identity>) {
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
  identity = { ...initial, ...next };
  signOut.mockReset();
  signOut.mockImplementation(async () => {
    setIdentity({ isSignedIn: false, session: null });
  });
}

export function ClerkProvider({ children }: { children: ReactNode }) {
  providerRendered();
  return children;
}
export const useAuth = () => useIdentity();
export const useSession = () => ({ session: useIdentity().session });
export const useUser = () => ({ user: { firstName: 'Test Rider' } });
export const useClerk = () => ({ signOut });
export const useSignIn = () => ({ signIn: signInResource });
export const useSignUp = () => ({ signUp: signUpResource });
