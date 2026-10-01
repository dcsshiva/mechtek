# Setup check for the Lovable Cloud (Supabase) connection

Add a self-diagnostic that confirms the backend connection and required environment variables are configured correctly, and shows the result in the app.

## What it checks

1. **Environment variables present** — `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (client) and, server-side, `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`.
2. **Correct backend** — the configured URL's project ref matches the connected Lovable Cloud backend. (The current `.env` points at a stale project ref `ierrgcoaetddesdadbqm` that matches no backend on this project — the check will flag this instead of failing silently.)
3. **Reachability** — an actual request to the backend (auth health endpoint + a lightweight table read) succeeds.
4. **Auth working** — `supabase.auth.getSession()` responds without a network error.
5. **Data tables reachable** — a read against the ERP tables succeeds (confirms grants/RLS aren't blocking the app).

## How it's built

- **New server function** `src/erp/setupcheck.functions.ts` (`createServerFn`, public): verifies server env vars are set and the server can reach the backend, returning a structured report `{ ok, checks: [{ name, ok, detail }] }`. No secrets or keys are returned — only pass/fail and plain-language detail.
- **Client-side checks** in a small helper `src/erp/setupcheck.ts`: client env vars present, URL well-formed, auth session call succeeds, table read succeeds.
- **UI surface**: a "System check" section on the **Admin** page (admin-only) that runs all checks on demand and shows each as pass/fail with a one-line explanation and fix hint. The login page shows a small warning banner only when the connection check fails, so users know why the app is in offline mode.

## Technical notes

- Server function stays public (no `requireSupabaseAuth`) so it can run on the login page before sign-in; it returns no sensitive values.
- Existing offline fallback (`AUTH.mode === "local"`) is unchanged — the check only reports status.
- No database schema changes.

## Verification

- Run the check in the preview: confirm it reports the env/backend mismatch (or passes once the backend connection is fixed), and that the login banner appears only on failure.
