import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { STAFF, SESSION, roleBy, staffBy } from "@/erp/engine";
import { restoreSession, signIn } from "@/erp/session";
import { toast } from "@/components/erp/ui";
import { ready } from "@/erp/persist";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    await ready();
    restoreSession();
    if (SESSION.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Sign in — MEK-SEL ERP" }] }),
  component: LoginPage,
});

const FLOW = ["Lead", "Quotation", "Sales order", "BOM & MRP", "Work order", "QC / FAT", "Dispatch", "Installed base"];

function LoginPage() {
  const navigate = useNavigate();
  const [loginAs, setLoginAs] = useState("S001");
  const pick = staffBy(loginAs) || {};
  const [user, setUser] = useState<string>(pick.username || "");
  const [pass, setPass] = useState<string>(pick.password || "");
  const [err, setErr] = useState("");

  const choose = (id: string) => {
    const x = staffBy(id);
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
            <div className="brand-name">MEK-SEL ERP</div>
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
          onSubmit={(e) => {
            e.preventDefault();
            const r = signIn(user, pass);
            if (!r.ok) return setErr(r.error);
            const x = staffBy(SESSION.user!);
            toast(`Signed in as ${x.name} (${roleBy(x.role).name})`);
            void navigate({ to: "/dashboard" });
          }}
        >
          <div>
            <h2>Sign in</h2>
            <p className="muted" style={{ marginTop: 4 }}>Choose a demo account, or type the credentials.</p>
          </div>
          <div className="acct-list" role="group" aria-label="Demo accounts">
            {STAFF.filter((x: any) => x.active).map((x: any) => (
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
          <button className="btn primary block" type="submit">Sign in</button>
          <div className="demo-cred">
            <b>Demo credentials</b>
            <span>Pick an account above to fill in its user ID and password. Accounts come from the Staff master; each role sees only its permitted modules.</span>
            <span>Administrator: <span className="mono">admin</span> / <span className="mono">mechtek@2026</span></span>
            <span className="muted small">This demo login is for presentation only and does not secure data.</span>
          </div>
        </form>
      </section>
    </div>
  );
}
