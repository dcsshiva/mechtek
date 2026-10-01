import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { SESSION, roleBy, staffBy } from "@/erp/engine";
import { AUTH, DEMO_ACCOUNTS, restoreSession, signIn } from "@/erp/session";
import { toast } from "@/components/erp/ui";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    await restoreSession();
    if (SESSION.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Sign in — Selvantra Technologies" }] }),
  component: LoginPage,
});

const FLOW = ["Lead", "Quotation", "Sales order", "BOM & MRP", "Work order", "QC / FAT", "Dispatch", "Installed base"];

function LoginPage() {
  const navigate = useNavigate();
  const [loginAs, setLoginAs] = useState("S001");
  const pick = DEMO_ACCOUNTS.find((x) => x.id === loginAs);
  const [user, setUser] = useState<string>(pick?.username || "");
  const [pass, setPass] = useState<string>(pick?.password || "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const choose = (id: string) => {
    const x = DEMO_ACCOUNTS.find((z) => z.id === id)!;
    setLoginAs(id);
    setUser(x.username);
    setPass(x.password);
    setErr("");
  };

  return (
    <div className="login">
      <section className="login-brand">
        <div className="brand-row">
          <img className="brand-logo lg" src="/mechtek-logo.png" alt="Mechtek" width={86} height={77} />
          <div>
            <div className="brand-name">Selvantra Technologies</div>
            <div className="small">for Mechtek, Bengaluru · Surpassing Expectations</div>
          </div>
        </div>
        <div>
          <h1>Enquiry to dispatch, in one system.</h1>
          <p className="lead">
            A working prototype for Mechtek's blister packing machines, de-foiling machines and change parts: CRM, quotations,
            bills of materials, material planning, production, dispatch and service.
          </p>
          <div className="flow">
            {FLOW.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
        <p className="foot">Built by Selvantra Technologies · Systems That Work. Businesses That Scale.</p>
      </section>
      <section className="login-form-wrap">
        <form
          className="login-form"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            const r = await signIn(user, pass);
            setBusy(false);
            if (!r.ok) return setErr(r.error);
            const x = staffBy(SESSION.user!);
            toast(`Signed in as ${x.name} (${roleBy(x.role).name})${AUTH.mode === "local" ? ". Lovable Cloud is not reachable, so changes stay in this browser." : ""}`);
            void navigate({ to: "/dashboard" });
          }}
        >
          <div>
            <h2>Sign in</h2>
            <p className="muted" style={{ marginTop: 4 }}>Choose a demo account, or type the credentials.</p>
          </div>
          <div className="acct-list" role="group" aria-label="Demo accounts">
            {DEMO_ACCOUNTS.map((x) => (
              <button type="button" key={x.id} className="acct" aria-pressed={loginAs === x.id} onClick={() => choose(x.id)}>
                <b>{x.name}</b>
                <span className="small muted">{roleBy(x.role).name}</span>
              </button>
            ))}
          </div>
          {err && <div className="error-msg" role="alert">{err}</div>}
          <div className="field">
            <label htmlFor="lg-user">User ID</label>
            <input className="input" id="lg-user" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="lg-pass">Password</label>
            <input className="input" id="lg-pass" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>
          <button className="btn primary block" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <div className="demo-cred">
            <b>Demo credentials</b>
            <span>Pick an account above to fill in its user ID and password. Accounts come from the Staff master; each role sees only its permitted modules.</span>
            <span>Administrator: <span className="mono">admin</span> / <span className="mono">mechtek@2026</span></span>
            <span className="muted small">Logins are Lovable Cloud accounts. The demo passwords work until an administrator changes them in the Staff master.</span>
          </div>
        </form>
      </section>
    </div>
  );
}
