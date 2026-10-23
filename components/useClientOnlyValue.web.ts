import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// Match the server during hydration, then read the client value without an effect.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore<S | C>(subscribe, () => client, () => server);
}
