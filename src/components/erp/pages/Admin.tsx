// Administration: staff master (logins) and role master (module access and approval rights).
import { useEffect, useState } from "react";
import { APPROVALS, DEPTS, MODULES, MOD_KEYS, ROLES, SEQ, SESSION, STAFF, modName, roleBy, staffBy } from "@/erp/engine";
import { TODAY, ds, isoLocal } from "@/erp/format";
import { AUTH, UI, canEdit, setUI } from "@/erp/session";
import { STAFF_ID_TAKEN, loginActivity, saveLogin } from "@/erp/accounts.functions";
import { bump, useErp } from "@/erp/store";
import { Field, Modal, PageHead, Pill, Seg, closeModal, openModal, toast } from "../ui";
import { allow } from "./proc";
import { SYNC, resetToSample } from "@/erp/persist";

/** Signed in with Lovable Cloud: logins are changed in Supabase Auth, not in the staff record. */
const cloud = () => AUTH.mode === "cloud";
async function updateLogin(d: { staffId: string; username?: string; password?: string; active?: boolean; isNew?: boolean }) {
  if (!cloud()) return true;
  try {
    await saveLogin({ data: d });
    return true;
  } catch (e: any) {
    if (d.isNew && e?.message === STAFF_ID_TAKEN) return "taken";
    toast(`Could not update the login: ${e?.message || e}`, true);
    return false;
  }
}

const pwOk = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
/** Active staff left with full Staff + Role master access if one person's role/active flag changed. */
const adminsLeft = (exceptId: string | null, newRole?: string, newActive?: boolean) =>
  STAFF.filter((x: any) => {
    const role = x.id === exceptId ? newRole : x.role;
    const active = x.id === exceptId ? newActive : x.active;
    return active && roleBy(role).perms.staff === "full" && roleBy(role).perms.roles === "full";
  }).length;

/* ================= Staff master ================= */
export function StaffPage() {
  useErp();
  // Last sign-in is kept by Lovable Cloud, not in the staff records.
  useEffect(() => {
    if (!cloud() || !canEdit("staff")) return;
    loginActivity()
      .then((m) => { STAFF.forEach((x: any) => { if (m[x.id]) x.lastLogin = new Date(m[x.id]!); }); bump(); })
      .catch(() => {});
  }, []);
  const q = (UI.stSearch || "").trim().toLowerCase();
  const list = STAFF.filter((x: any) => (UI.stRole === "all" || x.role === UI.stRole) && (UI.stStatus === "all" || (UI.stStatus === "active") === x.active) && (!q || [x.name, x.code, x.username, x.designation, x.dept].join(" ").toLowerCase().includes(q)));
  const act = STAFF.filter((x: any) => x.active).length;
  const toggle = async (x: any) => {
    if (!allow("staff")) return;
    if (x.id === SESSION.user && x.active) return toast("You cannot deactivate your own account.", true);
    if (x.active && adminsLeft(x.id, x.role, false) < 1) return toast("At least one active staff member must keep full access to Staff and Role master.", true);
    if (!(await updateLogin({ staffId: x.id, active: !x.active }))) return;
    x.active = !x.active;
    bump(); toast(`${x.name} ${x.active ? "activated" : "deactivated"}`);
  };
  const resetData = async () => {
    if (!window.confirm("Delete all ERP data in the database for everyone and reload the sample data?")) return;
    try {
      await resetToSample();
      window.location.reload();
    } catch (e: any) {
      toast(`Could not reset: ${e?.message || e}`, true);
    }
  };
  return (
    <>
      <PageHead route="staff" title="Staff master" desc="Employees who can sign in to MEK-SEL ERP, with their department, role and login."
        actions={canEdit("staff") ? [
          ...(canEdit("roles") && SYNC.status === "online" ? [<button key="r" className="btn" onClick={resetData}>Reset demo data</button>] : []),
          <button key="n" className="btn primary" onClick={() => openModal(<StaffModal />)}>Add staff</button>,
        ] : undefined} />
      <div className="kpis">
        <div className="kpi"><span className="k-label">Staff</span><span className="k-value">{STAFF.length}</span><span className="k-foot">{act} active, {STAFF.length - act} inactive</span></div>
        <div className="kpi"><span className="k-label">Roles in use</span><span className="k-value">{new Set(STAFF.filter((x: any) => x.active).map((x: any) => x.role)).size}</span><span className="k-foot">of {ROLES.length} roles defined</span></div>
        <div className="kpi"><span className="k-label">Can approve quotations</span><span className="k-value">{STAFF.filter((x: any) => x.active && roleBy(x.role).approvals.quotes).length}</span><span className="k-foot">active staff</span></div>
      </div>
      <div className="toolbar">
        <label htmlFor="st-role" style={{ position: "absolute", left: -9999 }}>Role</label>
        <select className="input" id="st-role" value={UI.stRole} onChange={(e) => setUI({ stRole: e.target.value })}>
          <option value="all">All roles</option>
          {ROLES.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <Seg label="Status" value={UI.stStatus} onChange={(v) => setUI({ stStatus: v })} options={[["active", "Active"], ["inactive", "Inactive"], ["all", "All"]]} />
      </div>
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Role</th><th>User ID / Emp. code</th><th>Mobile</th><th>Status / last sign-in</th><th></th></tr></thead>
            <tbody>
              {list.map((x: any) => (
                <tr key={x.id}>
                  <td style={{ minWidth: 190 }}>
                    <div className="cell-title nowrap">{x.name}{x.id === SESSION.user && <span className="small muted"> (you)</span>}</div>
                    <div className="cell-sub">{x.designation} · {x.dept}</div>
                  </td>
                  <td><span className="role-chip">{roleBy(x.role).name}</span></td>
                  <td><div className="mono cell-title">{x.username}</div><div className="cell-sub mono">{x.code}</div></td>
                  <td className="nowrap">+91 {x.mobile}</td>
                  <td className="nowrap">
                    {x.active ? <Pill t="Active" c="ok" /> : <Pill t="Inactive" />}
                    <div className="cell-sub">{x.lastLogin ? ds(x.lastLogin) + " · " + x.lastLogin.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Not signed in yet"}</div>
                  </td>
                  <td className="nowrap">
                    {canEdit("staff") && (
                      <>
                        <button className="btn sm" onClick={() => openModal(<StaffModal id={x.id} />)}>Edit</button>{" "}
                        <button className="btn sm" onClick={() => openModal(<PwModal id={x.id} />)} title="Reset password">Password</button>{" "}
                        <button className="btn sm ghost" onClick={() => toggle(x)}>{x.active ? "Deactivate" : "Activate"}</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={6} className="empty">No staff match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function PwInput({ id, value, onChange, err }: { id: string; value: string; onChange: (v: string) => void; err?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input className={`input ${err ? "invalid" : ""}`} id={id} type={show ? "text" : "password"} autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="pw-toggle" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
    </div>
  );
}

function StaffModal({ id }: { id?: string }) {
  const x = id ? staffBy(id) : null;
  const nextCode = "EMP-" + String(Math.max(0, ...STAFF.map((z: any) => parseInt(z.code.replace(/\D/g, "")) || 0)) + 1).padStart(3, "0");
  const [f, setF] = useState({
    name: x?.name || "", code: x ? x.code : nextCode, desig: x?.designation || "", dept: x?.dept || DEPTS[0], mobile: x?.mobile || "", email: x?.email || "",
    doj: x ? x.doj : isoLocal(TODAY), role: x?.role || ROLES[0].id, user: x?.username || "", p1: "", p2: "", active: !x || x.active ? "1" : "0",
  });
  const [e, setE] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: any) => setF({ ...f, [k]: typeof v === "string" ? v : v.target.value });
  const save = async () => {
    if (busy) return;
    if (!allow("staff")) return;
    const name = f.name.trim(), desig = f.desig.trim(), user = f.user.trim().toLowerCase(), mobile = f.mobile.trim(), email = f.email.trim(), code = f.code.trim(), active = f.active === "1";
    const errs: Record<string, string> = {};
    if (!name) errs.name = "Enter the full name.";
    if (!desig) errs.desig = "Enter a designation.";
    if (!code) errs.code = "Enter an employee code."; else if (STAFF.some((z: any) => z.code.toLowerCase() === code.toLowerCase() && z !== x)) errs.code = "This employee code is already used.";
    if (mobile && !/^\d{10}$/.test(mobile.replace(/\s/g, ""))) errs.mobile = "Enter a 10-digit mobile number.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address.";
    if (!/^[a-z0-9._]{3,20}$/.test(user)) errs.user = "3 to 20 characters: lowercase letters, numbers, dot or underscore.";
    else if (STAFF.some((z: any) => z.username === user && z !== x)) errs.user = "This user ID is already taken.";
    if (!x || f.p1) {
      if (!pwOk(f.p1)) errs.p1 = "At least 8 characters, with a letter and a number.";
      if (f.p1 !== f.p2) errs.p2 = "Passwords do not match.";
    }
    if (!Object.keys(errs).length && x && x.id === SESSION.user && !active) errs.active = "You cannot deactivate your own account.";
    if (!Object.keys(errs).length && x && adminsLeft(x.id, f.role, active) < 1) errs.role = "At least one active staff member must keep full access to Staff and Role master.";
    setE(errs);
    if (Object.keys(errs).length) return;
    const m = mobile.replace(/\s/g, "");
    const mob = m ? m.slice(0, 5) + " " + m.slice(5) : "";
    const data = { name, designation: desig, dept: f.dept, role: f.role, mobile: mob, email, doj: f.doj, username: user, active, code };
    const newId = () => {
      while (STAFF.some((z: any) => z.id === "S" + String(SEQ.staff).padStart(3, "0"))) SEQ.staff++;
      return "S" + String(SEQ.staff).padStart(3, "0");
    };
    let sid = x ? x.id : newId();
    setBusy(true);
    let ok = await updateLogin({ staffId: sid, username: user, password: f.p1 || undefined, active, isNew: !x });
    // Someone else just took this staff id: take the next one.
    for (let i = 0; ok === "taken" && i < 20; i++) {
      SEQ.staff++;
      sid = newId();
      ok = await updateLogin({ staffId: sid, username: user, password: f.p1 || undefined, active, isNew: true });
    }
    setBusy(false);
    if (ok !== true) return;
    // Offline, the password is checked in this browser; with Lovable Cloud it lives only in Supabase Auth.
    const pw = cloud() ? {} : f.p1 ? { password: f.p1 } : {};
    if (x) Object.assign(x, data, pw);
    else { SEQ.staff++; STAFF.push({ id: sid, ...data, ...pw, lastLogin: null }); }
    closeModal(); bump(); toast(x ? `${name} updated` : `${name} added. They can sign in as ${user}.`);
  };
  const inp = (k: keyof typeof f, label: string, extra: any = {}) => (
    <Field id={"sf-" + k} label={label} err={e[k]}>
      <input className={`input ${extra.mono ? "mono" : ""} ${e[k] ? "invalid" : ""}`} id={"sf-" + k} type={extra.type || "text"} value={f[k]} onChange={set(k)} placeholder={extra.ph} autoComplete="off" />
    </Field>
  );
  return (
    <Modal wide title={x ? `Edit staff · ${x.name}` : "Add staff"}
      foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? "Saving…" : x ? "Save changes" : "Add staff"}</button></>}>
      <div className="form-section">
        <h3>Basic details</h3>
        <div className="form-grid">
          {inp("name", "Full name *")}
          {inp("code", "Employee code")}
          {inp("desig", "Designation *", { ph: "e.g. Sales executive" })}
          <Field id="sf-dept" label="Department">
            <select className="input" id="sf-dept" value={f.dept} onChange={set("dept")}>{DEPTS.map((d: string) => <option key={d}>{d}</option>)}</select>
          </Field>
          {inp("mobile", "Mobile", { ph: "10-digit number" })}
          {inp("email", "Email", { type: "email" })}
          {inp("doj", "Date of joining", { type: "date" })}
        </div>
      </div>
      <div className="form-section">
        <h3>Login access</h3>
        <div className="form-grid">
          <Field id="sf-role" label="Role *" err={e.role}>
            <select className="input" id="sf-role" value={f.role} onChange={set("role")}>{ROLES.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          </Field>
          {inp("user", "User ID *", { mono: true, ph: "lowercase, e.g. karthik.m" })}
          <Field id="sf-p1" label={x ? "New password (leave blank to keep)" : "Password *"} err={e.p1}><PwInput id="sf-p1" value={f.p1} onChange={set("p1")} err={e.p1} /></Field>
          <Field id="sf-p2" label="Confirm password" err={e.p2}><PwInput id="sf-p2" value={f.p2} onChange={set("p2")} err={e.p2} /></Field>
          <Field id="sf-active" label="Status" err={e.active}>
            <select className="input" id="sf-active" value={f.active} onChange={set("active")}>
              <option value="1">Active: can sign in</option><option value="0">Inactive: cannot sign in</option>
            </select>
          </Field>
        </div>
        <p className="small muted">Password: at least 8 characters, with a letter and a number. Passwords are never shown again after saving.</p>
      </div>
    </Modal>
  );
}

function PwModal({ id }: { id: string }) {
  const x = staffBy(id);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [e, setE] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!allow("staff") || busy) return;
    const errs: Record<string, string> = {};
    if (!pwOk(p1)) errs.p1 = "At least 8 characters, with a letter and a number.";
    if (p1 !== p2) errs.p2 = "Passwords do not match.";
    setE(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const ok = await updateLogin({ staffId: x.id, username: x.username, password: p1 });
    setBusy(false);
    if (!ok) return;
    if (!cloud()) x.password = p1;
    closeModal(); bump(); toast(`Password reset for ${x.name}`);
  };
  return (
    <Modal title={`Reset password · ${x.name}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Reset password"}</button></>}>
      <p className="muted">User ID <span className="mono">{x.username}</span>. The new password takes effect at the next sign-in.</p>
      <Field id="rp-1" label="New password" err={e.p1}><PwInput id="rp-1" value={p1} onChange={setP1} err={e.p1} /></Field>
      <Field id="rp-2" label="Confirm new password" err={e.p2}><PwInput id="rp-2" value={p2} onChange={setP2} err={e.p2} /></Field>
    </Modal>
  );
}

/* ================= Role master ================= */
export function RolesPage() {
  useErp();
  const del = (r: any) => {
    if (!allow("roles")) return;
    const n = STAFF.filter((x: any) => x.role === r.id).length;
    if (n) return toast(`${r.name} is assigned to ${n} staff. Move them to another role first.`, true);
    ROLES.splice(ROLES.indexOf(r), 1);
    bump(); toast(`Role ${r.name} deleted`);
  };
  return (
    <>
      <PageHead route="roles" title="Role master" desc="Roles decide which modules a person sees, whether they can change data, and which documents they approve."
        actions={canEdit("roles") ? [<button key="n" className="btn primary" onClick={() => openModal(<RoleModal />)}>Add role</button>] : undefined} />
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Role</th><th>Module access</th><th>Approves</th><th className="num">Staff</th><th></th></tr></thead>
            <tbody>
              {ROLES.map((r: any) => {
                const n = STAFF.filter((x: any) => x.role === r.id).length;
                const acc = MOD_KEYS.filter((k: string) => r.perms[k] !== "none");
                const ap = APPROVALS.filter(([k]: any) => r.approvals[k]);
                return (
                  <tr key={r.id}>
                    <td style={{ minWidth: 220 }}><div className="cell-title">{r.name} {r.system && <Pill t="System" />}</div><div className="cell-sub">{r.desc}</div></td>
                    <td style={{ minWidth: 260 }}>
                      <div className="access-dots">
                        {acc.map((k: string) => <span key={k} className={r.perms[k]} title={r.perms[k] === "full" ? "Full access" : "View only"}>{modName(k)}{r.perms[k] === "view" ? " (view)" : ""}</span>)}
                        {!acc.length && <span>No modules</span>}
                      </div>
                    </td>
                    <td style={{ minWidth: 150 }}>{ap.length ? ap.map(([k, nm]: any) => <div key={k} className="small">{nm}</div>) : <span className="muted small">None</span>}</td>
                    <td className="num">{n}</td>
                    <td className="nowrap">
                      {canEdit("roles") && (
                        <>
                          <button className="btn sm" onClick={() => openModal(<RoleModal id={r.id} />)}>{r.system ? "View" : "Edit"}</button>
                          {!r.system && <> <button className="btn sm ghost" onClick={() => del(r)} style={{ color: "var(--bad)" }}>Delete</button></>}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function RoleModal({ id }: { id?: string }) {
  const r = id ? roleBy(id) : null;
  const locked = !!(r && r.system);
  const [name, setName] = useState(r?.name || "");
  const [desc, setDesc] = useState(r?.desc || "");
  const [perms, setPerms] = useState<Record<string, string>>(() => Object.fromEntries(MOD_KEYS.map((k: string) => [k, r ? r.perms[k] || "none" : "none"])));
  const [apv, setApv] = useState<Record<string, boolean>>(() => Object.fromEntries(APPROVALS.map(([k]: any) => [k, !!(r && r.approvals[k])])));
  const [e, setE] = useState<Record<string, string>>({});
  const save = () => {
    if (!allow("roles")) return;
    const nm = name.trim();
    if (!nm) return setE({ name: "Enter a role name." });
    if (ROLES.some((z: any) => z.name.toLowerCase() === nm.toLowerCase() && z !== r)) return setE({ name: "A role with this name already exists." });
    if (!MOD_KEYS.some((k: string) => perms[k] !== "none")) return setE({ all: "Give the role access to at least one module." });
    if (r) {
      const before = { ...r.perms };
      r.perms = { ...perms };
      if (adminsLeft(null) < 1) { r.perms = before; return setE({ all: "This change would leave nobody able to manage staff and roles." }); }
      r.name = nm; r.desc = desc.trim(); r.approvals = { ...apv };
    } else ROLES.push({ id: "R" + String(SEQ.role++).padStart(2, "0"), name: nm, desc: desc.trim(), approvals: { ...apv }, perms: { ...perms } });
    closeModal(); bump(); toast(r ? `Role ${nm} saved` : `Role ${nm} added`);
  };
  return (
    <Modal wide title={r ? (locked ? `Role · ${r.name}` : `Edit role · ${r.name}`) : "Add role"}
      foot={locked ? <button className="btn primary" onClick={closeModal}>Close</button> : <><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>{r ? "Save role" : "Add role"}</button></>}>
      {locked && <div className="lock-note">Administrator is a system role. It always has full access so that someone can manage staff and roles.</div>}
      <div className="form-grid">
        <Field id="rl-name" label="Role name *" err={e.name}><input className={`input ${e.name ? "invalid" : ""}`} id="rl-name" value={name} onChange={(x) => setName(x.target.value)} disabled={locked} /></Field>
        <Field id="rl-desc" label="Description"><input className="input" id="rl-desc" value={desc} onChange={(x) => setDesc(x.target.value)} disabled={locked} /></Field>
      </div>
      <div>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Approvals</h3>
        <p className="small muted" style={{ marginBottom: 10 }}>This role can approve fully, approve partly or reject these documents.</p>
        <div className="check-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 8 }}>
          {APPROVALS.map(([k, n]: any) => (
            <label key={k} htmlFor={"rl-ap-" + k}>
              <input type="checkbox" id={"rl-ap-" + k} checked={apv[k]} disabled={locked} onChange={(x) => setApv({ ...apv, [k]: x.target.checked })} /> {n}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Module access</h3>
        <p className="small muted" style={{ marginBottom: 10 }}>View only: can open and read the module. Full access: can also create, change and act on records.</p>
        <div className="table-wrap">
          <table className="data perm-table">
            <thead><tr><th>Module</th><th>No access</th><th>View only</th><th>Full access</th></tr></thead>
            <tbody>
              {MODULES.map(([g, mods]: any) => [
                <tr key={g} className="perm-group"><td colSpan={4}>{g}</td></tr>,
                ...mods.map(([k, n]: any) => (
                  <tr key={k}>
                    <td>{n}</td>
                    {["none", "view", "full"].map((L) => (
                      <td key={L}>
                        <input type="radio" name={"perm-" + k} value={L} checked={perms[k] === L} disabled={locked} onChange={() => setPerms({ ...perms, [k]: L })}
                          aria-label={`${n}: ${L === "none" ? "No access" : L === "view" ? "View only" : "Full access"}`} />
                      </td>
                    ))}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </div>
      {e.all && <p className="small" role="alert" style={{ color: "var(--bad)" }}>{e.all}</p>}
    </Modal>
  );
}
