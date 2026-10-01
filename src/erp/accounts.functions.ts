// Staff logins in Lovable Cloud (Supabase Auth).
//
// Each staff member signs in with an Auth account whose email is derived from their user ID
// (no email is ever sent to it) and whose app_metadata.staff_id links it to the Staff master.
// Only these server functions, which use the service-role key, create or change accounts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STAFF as SEED_STAFF } from "./engine";

export const LOGIN_DOMAIN = "staff.meksel-erp.local";
/** The Auth email for an ERP user ID. */
export const loginEmail = (username: string) => `${username.trim().toLowerCase()}@${LOGIN_DOMAIN}`;

type StaffRec = { id: string; username: string; role: string; active: boolean; password?: string };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function listLogins(sb: any) {
  const out: any[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users || [];
    out.push(...users.filter((u: any) => (u.email || "").endsWith("@" + LOGIN_DOMAIN)));
    if (users.length < 1000) return out;
  }
}

async function records(sb: any, collection: string): Promise<any[]> {
  const { data, error } = await sb.from("erp_records").select("id,data").eq("collection", collection);
  if (error) throw error;
  return (data || []).map((r: any) => r.data?.r).filter(Boolean);
}

const BAN = (active: boolean) => (active ? "none" : "876000h");

/**
 * First run: create a login for every staff member, with the demo passwords.
 * Does nothing once any ERP login exists, so it cannot be used to reset a password.
 */
export const setupDemoLogins = createServerFn({ method: "POST" }).handler(async () => {
  const sb = await admin();
  if ((await listLogins(sb)).length) return { created: 0 };
  const seedPw = Object.fromEntries((SEED_STAFF as StaffRec[]).map((x) => [x.id, x.password]));
  let staff: StaffRec[] = [];
  try {
    staff = await records(sb, "staff");
  } catch {
    /* table not created yet: use the sample staff */
  }
  if (!staff.length) staff = SEED_STAFF as StaffRec[];
  let created = 0;
  for (const x of staff) {
    const password = x.password || seedPw[x.id];
    if (!x.username || !password) continue;
    const { error } = await sb.auth.admin.createUser({
      email: loginEmail(x.username),
      password,
      email_confirm: true,
      app_metadata: { staff_id: x.id },
      ban_duration: BAN(x.active !== false),
    });
    if (error) console.error("[MEK-SEL] could not create login for", x.username, error.message);
    else created++;
  }
  return { created };
});

type SaveLogin = { staffId: string; username?: string; password?: string; active?: boolean };

/** Administrator: create or update a staff member's login (user ID, password, active). */
export const saveLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: SaveLogin) => {
    if (!d || typeof d.staffId !== "string" || !d.staffId) throw new Error("Staff id is required.");
    if (d.username != null && !/^[a-z0-9._]{3,20}$/.test(d.username)) throw new Error("Invalid user ID.");
    if (d.password != null && (typeof d.password !== "string" || d.password.length < 8)) throw new Error("Password must be at least 8 characters.");
    return d;
  })
  .handler(async ({ data, context }) => {
    const sb = await admin();
    // The caller must be an active staff member whose role has full Staff master access.
    const callerId = (context.claims as any)?.app_metadata?.staff_id;
    const [staff, roles] = await Promise.all([records(sb, "staff"), records(sb, "roles")]);
    const caller = staff.find((x) => x.id === callerId);
    const role = caller && roles.find((r) => r.id === caller.role);
    if (!caller || !caller.active || role?.perms?.staff !== "full") throw new Error("Only an administrator with full Staff master access can change logins.");

    const logins = await listLogins(sb);
    const login = logins.find((u) => u.app_metadata?.staff_id === data.staffId);
    if (data.username) {
      const taken = logins.find((u) => u.email === loginEmail(data.username!) && u !== login);
      if (taken) throw new Error("This user ID is already taken.");
    }
    if (!login) {
      if (!data.username || !data.password) throw new Error("A user ID and password are needed to create the login.");
      const { error } = await sb.auth.admin.createUser({
        email: loginEmail(data.username),
        password: data.password,
        email_confirm: true,
        app_metadata: { staff_id: data.staffId },
        ban_duration: BAN(data.active !== false),
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const patch: any = {};
    if (data.username && login.email !== loginEmail(data.username)) Object.assign(patch, { email: loginEmail(data.username), email_confirm: true });
    if (data.password) patch.password = data.password;
    if (data.active != null) patch.ban_duration = BAN(data.active);
    if (Object.keys(patch).length) {
      const { error } = await sb.auth.admin.updateUserById(login.id, patch);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
