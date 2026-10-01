// Setup check: confirms the Lovable Cloud (Supabase) connection and required
// environment variables are configured correctly. Client checks run in the
// browser; server checks come from setupcheck.functions.ts.
import { supabase } from "@/integrations/supabase/client";
import { serverSetupCheck, type SetupCheck } from "./setupcheck.functions";

export type { SetupCheck };
export type SetupReport = { ok: boolean; checks: SetupCheck[] };

/** Browser-side checks: env vars present, URL well-formed, auth and data reachable. */
export async function clientSetupChecks(): Promise<SetupCheck[]> {
  const checks: SetupCheck[] = [];
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

  checks.push({
    name: "App environment variables",
    ok: !!(url && key),
    detail:
      url && key
        ? "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set."
        : "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must both be set. Reconnect Lovable Cloud for this project.",
  });

  let host = "";
  if (url) {
    try {
      host = new URL(url).host;
      checks.push({
        name: "Backend address",
        ok: host.endsWith(".supabase.co"),
        detail: host.endsWith(".supabase.co")
          ? "The backend address is well-formed."
          : "The backend address does not look like a Lovable Cloud database address. Reconnect Lovable Cloud.",
      });
    } catch {
      checks.push({ name: "Backend address", ok: false, detail: "The backend address is not a valid URL. Reconnect Lovable Cloud." });
    }
  }

  if (url && key) {
    try {
      await supabase.auth.getSession();
      checks.push({ name: "Sign-in service", ok: true, detail: "The sign-in service answered." });
    } catch (e: any) {
      checks.push({
        name: "Sign-in service",
        ok: false,
        detail: `The sign-in service could not be reached (${e?.message || e}). The app will run in offline mode until this is fixed.`,
      });
    }
    try {
      const { error } = await supabase.from("roles").select("id").limit(1);
      checks.push({
        name: "Data tables",
        ok: !error,
        detail: error
          ? `The data tables could not be read (${error.message}). Access rules may be missing — ask the administrator to check the backend.`
          : "The data tables answered a read request.",
      });
    } catch (e: any) {
      checks.push({ name: "Data tables", ok: false, detail: `The data tables could not be read (${e?.message || e}).` });
    }
  }

  return checks;
}

/** Full report: client checks plus the server-side checks. */
export async function runSetupCheck(): Promise<SetupReport> {
  const client = await clientSetupChecks();
  let server: SetupCheck[] = [];
  try {
    server = (await serverSetupCheck()).checks;
  } catch (e: any) {
    server = [{ name: "Server environment", ok: false, detail: `The server-side check could not run (${e?.message || e}).` }];
  }
  const checks = [...client, ...server];
  return { ok: checks.every((c) => c.ok), checks };
}

/** Quick yes/no used by the login page banner. */
export async function connectionOk(): Promise<boolean> {
  const checks = await clientSetupChecks();
  return checks.every((c) => c.ok);
}
