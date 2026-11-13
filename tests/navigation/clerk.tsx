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
export function resetIdentity(next: Partial<Identity> = {}) {
  identity = { ...initial, ...next };
  signOut.mockReset();
  signOut.mockImplementation(async () => {
    setIdentity({ isSignedIn: false, session: null });
  });
}

export function ClerkProvider({ children }: { children: ReactNode }) { return children; }
export const useAuth = () => useIdentity();
export const useSession = () => ({ session: useIdentity().session });
export const useUser = () => ({ user: { firstName: 'Test Rider' } });
export const useClerk = () => ({ signOut });
// Phone operations must never be invoked by navigation tests.
export const useSignIn = () => ({ signIn: null });
export const useSignUp = () => ({ signUp: null });
