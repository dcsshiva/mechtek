// Server-side half of the setup check: confirms the server environment has the
// Lovable Cloud (Supabase) settings and that the backend answers. Public on
// purpose (the login page uses it before sign-in); it returns only pass/fail
// and plain-language detail — never key values.
import { createServerFn } from "@tanstack/react-start";

export type SetupCheck = { name: string; ok: boolean; detail: string };

export const serverSetupCheck = createServerFn({ method: "GET" }).handler(async (): Promise<{ ok: boolean; checks: SetupCheck[] }> => {
  const checks: SetupCheck[] = [];
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];

  checks.push({
    name: "Server environment variables",
    ok: !!(url && key),
    detail:
      url && key
        ? "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are set."
        : "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must both be set. Reconnect Lovable Cloud for this project.",
  });

  if (url && key) {
    try {
      const r = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(8000),
      });
      checks.push({
        name: "Backend reachable from the server",
        ok: r.ok,
        detail: r.ok
          ? "The backend answered a health request."
          : `The backend answered with status ${r.status}. The configured URL may point at a different or paused project — reconnect Lovable Cloud.`,
      });
    } catch (e: any) {
      checks.push({
        name: "Backend reachable from the server",
        ok: false,
        detail: `The backend could not be reached (${e?.message || e}). The configured URL may be wrong or the project paused — reconnect Lovable Cloud.`,
      });
    }
  }

  return { ok: checks.every((c) => c.ok), checks };
});
