// Signed-in user, role permissions and per-screen UI state (filters, tabs).
import { SESSION, ROLES, STAFF, MODULES, USERS, staffBy, roleBy } from "./engine";
import { bump } from "./store";
import { ready } from "./persist";
import { loginEmail, setupDemoLogins } from "./accounts.functions";
import { supabase } from "@/integrations/supabase/client";

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

/** Demo accounts as shipped (with their demo passwords), for the sign-in page. */
export const DEMO_ACCOUNTS: { id: string; name: string; role: string; username: string; password: string }[] = STAFF.filter(
  (x: any) => x.active,
).map((x: any) => ({ id: x.id, name: x.name, role: x.role, username: x.username, password: x.password }));

/** "cloud": signed in with Lovable Cloud (Supabase Auth). "local": the database could not be reached,
 * so the demo logins are checked in this browser and data stays here. */
export const AUTH: { mode: "cloud" | "local" | null } = { mode: null };

const offlineError = (e: any) => !!e && (e.name === "AuthRetryableFetchError" || e.status === 0 || /fetch|network/i.test(e.message || ""));

async function cloudSession() {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

let restored: Promise<void> | null = null;
/** Restore the signed-in user (client only) and load the ERP data. */
export function restoreSession(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!restored) restored = doRestore();
  return restored;
}
async function doRestore() {
  const s = await cloudSession();
  await ready();
  if (s) {
    const x = staffBy(s.user.app_metadata?.staff_id);
    if (x && x.active) {
      SESSION.user = x.id;
      AUTH.mode = "cloud";
    } else await supabase.auth.signOut().catch(() => {});
    return;
  }
  const id = safe.get(KEY);
  const x = id ? staffBy(id) : null;
  if (x && x.active && x.password) {
    SESSION.user = x.id;
    AUTH.mode = "local";
  }
}

const BAD = "User ID or password is incorrect. Use the demo credentials shown below.";
const INACTIVE = "This account is inactive. Ask the administrator to activate it in the Staff master.";

export async function signIn(username: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = loginEmail(username);
  let r: any;
  try {
    r = await supabase.auth.signInWithPassword({ email, password });
    if (r.error?.code === "invalid_credentials") {
      // First use of this database: create the demo logins, then try again.
      const setup = await setupDemoLogins().catch(() => null);
      if (setup?.created) r = await supabase.auth.signInWithPassword({ email, password });
    }
  } catch (e) {
    r = { error: e };
  }
  if (r.error && offlineError(r.error)) return localSignIn(username, password);
  if (r.error?.code === "user_banned") return { ok: false, error: INACTIVE };
  if (r.error) return { ok: false, error: r.error.code === "invalid_credentials" ? BAD : r.error.message || BAD };

  restored = Promise.resolve();
  await ready();
  const x = staffBy(r.data.user?.app_metadata?.staff_id);
  if (!x || !x.active) {
    await supabase.auth.signOut().catch(() => {});
    return { ok: false, error: x ? INACTIVE : "This login is not linked to anyone in the Staff master." };
  }
  AUTH.mode = "cloud";
  return finish(x);
}

/** Offline: check the demo passwords held in this browser. */
async function localSignIn(username: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await ready();
  const x = STAFF.find((z: any) => z.username.toLowerCase() === username.trim().toLowerCase());
  if (!x || !x.password || x.password !== password) return { ok: false, error: BAD };
  if (!x.active) return { ok: false, error: INACTIVE };
  AUTH.mode = "local";
  safe.set(KEY, x.id);
  restored = Promise.resolve();
  return finish(x);
}

function finish(x: any): { ok: true } {
  SESSION.user = x.id;
  x.lastLogin = new Date();
  UI.qFilter = "all";
  bump();
  return { ok: true };
}

/** Sign out and reload, so no ERP data stays in memory. */
export async function signOut() {
  safe.del(KEY);
  if (AUTH.mode === "cloud") await supabase.auth.signOut().catch(() => {});
  SESSION.user = null;
  window.location.assign("/login");
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
