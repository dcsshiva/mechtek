import { useSyncExternalStore } from "react";

// A tiny change counter. The engine mutates plain arrays; after every change call bump()
// so components using useErp() re-render. (Replaced by React Query + Supabase in the backend phase.)
let version = 0;
const listeners = new Set<() => void>();

export function bump() {
  version++;
  listeners.forEach((l) => l());
}

export function useErp() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => version,
  );
}

/** Subscribe to data changes outside React (used by the database sync). */
export function onChange(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
