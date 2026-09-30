// Signed-in user, role permissions and per-screen UI state (filters, tabs).
import { SESSION, ROLES, STAFF, MODULES, USERS, staffBy, roleBy } from "./engine";
import { bump } from "./store";

const KEY = "meksel_user";
const safe = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

let restored = false;
/** Restore the signed-in user from the browser (client only). */
export function restoreSession() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  const id = safe.get(KEY);
  const x = id ? staffBy(id) : null;
  SESSION.user = x && x.active ? x.id : null;
}

export function signIn(username: string, password: string): { ok: true } | { ok: false; error: string } {
  const x = STAFF.find((z: any) => z.username.toLowerCase() === username.trim().toLowerCase());
  if (x && x.password === password && !x.active)
    return { ok: false, error: "This account is inactive. Ask the administrator to activate it in the Staff master." };
  if (x && x.password === password) {
    SESSION.user = x.id;
    x.lastLogin = new Date();
    safe.set(KEY, x.id);
    UI.qFilter = "all";
    bump();
    return { ok: true };
  }
  return { ok: false, error: "User ID or password is incorrect. Use the demo credentials shown below." };
}

export function signOut() {
  SESSION.user = null;
  safe.del(KEY);
  bump();
}

export const me = () => USERS[SESSION.user ?? ""];
export const myRole = (): any => {
  const x = SESSION.user ? staffBy(SESSION.user) : null;
  return x ? roleBy(x.role) : null;
};
export type Level = "none" | "view" | "full";
export const level = (k: string): Level =>
  k === "dashboard" || k === "help" ? "view" : ((myRole() || { perms: {} }).perms[k] || "none");
export const canSee = (r: string) => level(r) !== "none";
export const canEdit = (k: string) => level(k) === "full";
export const canApprove = (t: string) => !!(myRole() && myRole().approvals && myRole().approvals[t]);
export const isAdmin = () => !!(myRole() && myRole().approvals && myRole().approvals.quotes);
export const modName = (k: string) =>
  ((MODULES as any[]).flatMap((g) => g[1]).find((m: any) => m[0] === k) || [k, k])[1];

/** Guard for actions: returns true if allowed, otherwise the reason. */
export function denyReason(mod: string): string | null {
  if (canEdit(mod)) return null;
  const r = myRole();
  return `${r ? r.name : "Your role"} has ${level(mod) === "view" ? "view-only" : "no"} access to ${modName(mod)}.`;
}

// Per-screen UI state that survives navigation (like the prototype's S object).
export const UI: Record<string, any> = {
  qFilter: "all",
  fgFilter: "all",
  rmFilter: "all",
  rmSearch: "",
  bomItem: "FG-EB160",
  mrpSel: null,
  mrpRun: null,
  f: {},
  crmTab: "follow",
  crmMine: true,
  crmType: "all",
  arTab: "ageing",
  arCust: "C003",
  apTab: "due",
  apVen: "V01",
  apSel: new Set<string>(),
  gateTab: "in",
  billTab: "bills",
  invTab: "stock",
  invSearch: "",
  invF: "all",
  planAll: false,
  planSel: null,
  cbSel: "FG-EB160",
  cbTab: "sets",
  stSearch: "",
  stRole: "all",
  stStatus: "active",
};
export const setUI = (patch: Record<string, any>) => {
  Object.assign(UI, patch);
  bump();
};

export { ROLES, STAFF };
