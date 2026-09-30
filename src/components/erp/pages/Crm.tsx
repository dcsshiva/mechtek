import { useState } from "react";
import {
  ACTS, ACT_TYPES, CONTACTS, CT_ROLES, CUST, INSTALLED, INVOICES, LEADS, QUOTES, ORDERS, QS, USERS, SEQ,
  acctContact, amcStatus, arOpen, creditTxt, ctBy, custAdvances, custBy, custContacts, custRefs, fgBy, invBal,
  lastAct, leadValue, mkAct, openFollowups, openOrders, orderStatus, orderValue, quoteValue, refLabel, refRoute,
} from "@/erp/engine";
import { SESSION } from "@/erp/engine";
import { TODAY, daysFrom, ds, fromIso, inr, inrShort, isoLocal } from "@/erp/format";
import { UI, canEdit, canSee, isAdmin, myRole, setUI } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { go } from "@/erp/nav";
import { Field, Modal, PageHead, Pill, Seg, closeModal, openModal, toast } from "../ui";
import { CustOptions } from "./common";

const DueChip = ({ d }: { d: Date }) => {
  const n = daysFrom(d);
  return <Pill t={n < 0 ? `${-n}d overdue` : n === 0 ? "Today" : `In ${n}d`} c={n < 0 ? "bad" : n === 0 ? "warn" : ""} />;
};
const CustLink = ({ cid }: { cid: string }) => (
  <button className="linkish cell-title" onClick={() => openModal(<Cust360 cid={cid} />)}>{custBy(cid).name}</button>
);
const RefLink = ({ r }: { r: string }) => {
  if (!r) return <>—</>;
  const route = refRoute(r) || "crm";
  return <a href={"/" + route} onClick={(e) => { e.preventDefault(); go(route); }}>{refLabel(r)}</a>;
};

function followRows() {
  const mine = UI.crmMine && !isAdmin();
  const a = openFollowups().filter((x: any) => !mine || x.by === SESSION.user).map((x: any) => ({ kind: "act", due: x.due, x }));
  const l = LEADS.filter((x: any) => x.follow && !["Won", "Lost"].includes(x.stage)).map((x: any) => ({ kind: "lead", due: x.follow, x }));
  return [...a, ...l].sort((p: any, q: any) => p.due - q.due);
}

export function CrmPage() {
  useErp();
  const tab = UI.crmTab;
  const ed = canEdit("crm");
  const fr = followRows();
  const od = fr.filter((r) => daysFrom(r.due) < 0).length, td = fr.filter((r) => daysFrom(r.due) === 0).length;
  const week = ACTS.filter((a: any) => a.status === "Done" && daysFrom(a.date) >= -7).length;
  const openL = LEADS.filter((l: any) => !["Won", "Lost"].includes(l.stage));
  const openQ = QUOTES.filter((q: any) => [QS.pend, QS.appr, QS.sent, QS.clar].includes(q.status));
  const won = LEADS.filter((l: any) => l.stage === "Won").length, lost = LEADS.filter((l: any) => l.stage === "Lost").length;
  const pipe = openL.reduce((s: number, l: any) => s + leadValue(l), 0) + openQ.filter((q: any) => !q.lead || !openL.some((l: any) => l.id === q.lead)).reduce((s: number, q: any) => s + quoteValue(q), 0);

  return (
    <>
      <PageHead
        route="crm"
        title="CRM desk"
        desc="Follow-ups, calls, visits and contacts for every customer, linked to leads, quotations, orders and invoices."
        actions={ed || canEdit("receivables") ? [<button key="l" className="btn primary" onClick={() => openAct({})}>Log activity</button>] : undefined}
      />
      <div className="kpis">
        <div className={`kpi ${od ? "alert" : ""}`}><span className="k-label">Follow-ups overdue</span><span className="k-value">{od}</span><span className="k-foot">{td} due today</span></div>
        <div className="kpi"><span className="k-label">Activities this week</span><span className="k-value">{week}</span><span className="k-foot">calls, visits, e-mails, demos</span></div>
        <div className="kpi"><span className="k-label">Open pipeline</span><span className="k-value">{inrShort(pipe)}</span><span className="k-foot">{openL.length} leads, {openQ.length} live quotes</span></div>
        <div className="kpi"><span className="k-label">Lead win rate</span><span className="k-value">{won + lost ? Math.round((won / (won + lost)) * 100) + "%" : "—"}</span><span className="k-foot">{won} won, {lost} lost</span></div>
      </div>
      <div className="toolbar">
        <Seg wrap value={tab} onChange={(v) => setUI({ crmTab: v })}
          options={[["follow", `Follow-ups (${fr.length})`], ["log", "Activity log"], ["contacts", `Contacts (${CONTACTS.length})`], ["pipe", "Pipeline"]]} />
      </div>
      {tab === "follow" && <FollowTab fr={fr} ed={ed} />}
      {tab === "log" && <LogTab />}
      {tab === "contacts" && <ContactsTab ed={ed} />}
      {tab === "pipe" && <PipeTab ed={ed} />}
    </>
  );
}

function FollowTab({ fr, ed }: { fr: any[]; ed: boolean }) {
  return (
    <>
      <div className="toolbar">
        {!isAdmin() && (
          <Seg label="Owner" value={UI.crmMine} onChange={(v) => setUI({ crmMine: v })} options={[[true, "Mine"], [false, "Everyone"]]} />
        )}
      </div>
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Due</th><th>Customer</th><th>Follow-up</th><th>Linked to</th><th>Owner</th><th></th></tr></thead>
            <tbody>
              {fr.map((r: any) => {
                if (r.kind === "lead") {
                  const l = r.x;
                  return (
                    <tr key={"l" + l.id}>
                      <td className="nowrap"><DueChip d={l.follow} /><div className="cell-sub">{ds(l.follow)}</div></td>
                      <td style={{ minWidth: 150 }}><CustLink cid={l.cust} /><div className="cell-sub">{(custContacts(l.cust).find((c: any) => c.primary) || { name: custBy(l.cust).contact }).name}</div></td>
                      <td style={{ minWidth: 200 }}>Lead follow-up<div className="cell-sub">{l.qty} × {fgBy[l.item].name} · {l.stage}</div></td>
                      <td className="small"><RefLink r={l.id} /></td>
                      <td className="small">Sales</td>
                      <td className="nowrap">{ed && <button className="btn sm" onClick={() => openAct({ cust: l.cust, ref: l.id })}>Log activity</button>}</td>
                    </tr>
                  );
                }
                const a = r.x, c = ctBy(a.contact);
                return (
                  <tr key={a.id}>
                    <td className="nowrap"><DueChip d={a.due} /><div className="cell-sub">{ds(a.due)}</div></td>
                    <td style={{ minWidth: 150 }}><CustLink cid={a.cust} /><div className="cell-sub">{c ? `${c.name} · ${c.mobile}` : ""}</div></td>
                    <td style={{ minWidth: 200 }}>{a.subject}<div className="cell-sub">{a.type}</div></td>
                    <td className="small"><RefLink r={a.ref} /></td>
                    <td className="small nowrap">{USERS[a.by].name}</td>
                    <td className="nowrap">
                      {(ed || (a.type === "Collection call" && canEdit("receivables"))) && (
                        <button className="btn sm primary" onClick={() => openAct({ complete: a.id })}>Complete</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!fr.length && <tr><td colSpan={6} className="empty">No follow-ups. You are all caught up.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function LogTab() {
  const list = ACTS.filter((a: any) => a.status === "Done" && (UI.crmType === "all" || a.type === UI.crmType)).sort((a: any, b: any) => b.date - a.date);
  return (
    <>
      <div className="toolbar">
        <label htmlFor="crm-type" className="sr-only">Type</label>
        <select className="input" id="crm-type" style={{ width: "auto" }} value={UI.crmType} onChange={(e) => setUI({ crmType: e.target.value })}>
          <option value="all">All types</option>
          {ACT_TYPES.map((t: string) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Date</th><th>Customer</th><th>Activity</th><th>Outcome</th><th>Linked to</th><th>By</th></tr></thead>
            <tbody>
              {list.map((a: any) => {
                const c = ctBy(a.contact);
                return (
                  <tr key={a.id}>
                    <td className="nowrap">{ds(a.date)}<div className="cell-sub">{a.type}</div></td>
                    <td style={{ minWidth: 150 }}><CustLink cid={a.cust} /><div className="cell-sub">{c ? c.name : ""}</div></td>
                    <td style={{ minWidth: 240 }}><div className="cell-title" style={{ fontWeight: 500 }}>{a.subject}</div><div className="cell-sub">{a.notes}</div></td>
                    <td className="small">{a.outcome || "—"}{a.promise && <div className="cell-sub">Promise {inr(a.promise.amt)} by {ds(a.promise.date)}</div>}</td>
                    <td className="small">{a.ref ? refLabel(a.ref) : "—"}</td>
                    <td className="small nowrap">{USERS[a.by].name}</td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={6} className="empty">No activities of this type.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ContactsTab({ ed }: { ed: boolean }) {
  return (
    <>
      <div className="toolbar">{ed && <button className="btn" onClick={() => openModal(<CtModal />)}>Add contact</button>}</div>
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Contact</th><th>Customer</th><th>Role</th><th>Mobile / e-mail</th><th>Last activity</th><th></th></tr></thead>
            <tbody>
              {CONTACTS.slice().sort((a: any, b: any) => custBy(a.cust).name.localeCompare(custBy(b.cust).name)).map((c: any) => {
                const la = ACTS.filter((a: any) => a.contact === c.id && a.status === "Done").sort((a: any, b: any) => b.date - a.date)[0];
                return (
                  <tr key={c.id}>
                    <td style={{ minWidth: 160 }}><div className="cell-title">{c.name} {c.primary && <Pill t="Primary" c="info" />}</div><div className="cell-sub">{c.desig}</div></td>
                    <td><button className="linkish" onClick={() => openModal(<Cust360 cid={c.cust} />)}>{custBy(c.cust).name}</button></td>
                    <td className="small">{c.role}</td>
                    <td className="small nowrap">{c.mobile}<div className="cell-sub">{c.email}</div></td>
                    <td className="small">{la ? `${ds(la.date)} · ${la.type}` : <span className="muted">None yet</span>}</td>
                    <td className="nowrap">
                      {ed && (
                        <>
                          <button className="btn sm" onClick={() => openModal(<CtModal id={c.id} />)}>Edit</button>{" "}
                          <button className="btn sm ghost" onClick={() => openAct({ cust: c.cust, ct: c.id })}>Log</button>
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

function PipeTab({ ed }: { ed: boolean }) {
  const yr = TODAY.getFullYear();
  const rows: [string, number, number][] = [
    ...[["New leads", LEADS.filter((l: any) => l.stage === "New")], ["Qualified", LEADS.filter((l: any) => l.stage === "Qualified")]].map(
      ([n, a]: any) => [n, a.length, a.reduce((s: number, l: any) => s + leadValue(l), 0)] as [string, number, number],
    ),
    ...[["Quotes in approval", QUOTES.filter((q: any) => [QS.pend, QS.clar, QS.draft].includes(q.status))], ["Quotes with customer", QUOTES.filter((q: any) => [QS.appr, QS.sent].includes(q.status))]].map(
      ([n, a]: any) => [n, a.length, a.reduce((s: number, q: any) => s + quoteValue(q), 0)] as [string, number, number],
    ),
    ["Won: orders this year", ORDERS.filter((o: any) => o.date.getFullYear() === yr).length, ORDERS.filter((o: any) => o.date.getFullYear() === yr).reduce((s: number, o: any) => s + orderValue(o), 0)],
  ];
  const mx = Math.max(1, ...rows.map((r) => r[2]));
  const stale = QUOTES.filter((q: any) => q.status === QS.sent).map((q: any) => {
    const h = q.history.filter((x: any) => x.act === "Sent to customer").pop();
    return { q, days: h ? -daysFrom(h.at) : 0 };
  });
  return (
    <>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Sales funnel</h2><span className="small muted">Value at list price, net of quote discount</span></div>
          <div className="card-body">
            <div className="hbar-list">
              {rows.map((r) => (
                <div className="hbar" key={r[0]}>
                  <span className="lbl">{r[0]} ({r[1]})</span>
                  <div className="track"><div className="fill" style={{ width: `${((r[2] / mx) * 100).toFixed(1)}%` }} /></div>
                  <span className="val">{inrShort(r[2])}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><h2>Quotes with the customer</h2><button className="btn ghost sm" onClick={() => go("quotes")}>Quotations</button></div>
          <div className="table-wrap">
            <table className="data">
              <tbody>
                {stale.map(({ q, days }: any) => (
                  <tr key={q.id}>
                    <td><div className="cell-title mono">{q.id}</div><div className="cell-sub">{custBy(q.cust).name}</div></td>
                    <td className="num">{inr(quoteValue(q))}</td>
                    <td><Pill t={`Sent ${days}d ago`} c={days > 7 ? "warn" : ""} /></td>
                    <td>{ed && <button className="btn sm" onClick={() => openAct({ cust: q.cust, ref: q.id })}>Follow up</button>}</td>
                  </tr>
                ))}
                {!stale.length && <tr><td className="empty">No quotes waiting on customers.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <section className="card">
        <div className="card-head"><h2>Customers at a glance</h2></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Customer</th><th className="num">Pipeline</th><th className="num">Open orders</th><th className="num">Receivable</th><th className="num">Machines</th><th>Last contact</th><th></th></tr></thead>
            <tbody>
              {CUST.map((c: any) => {
                const pl = LEADS.filter((l: any) => l.cust === c.id && !["Won", "Lost"].includes(l.stage)).reduce((s: number, l: any) => s + leadValue(l), 0);
                const oo = openOrders().filter((o: any) => o.cust === c.id).reduce((s: number, o: any) => s + orderValue(o), 0);
                const rec = INVOICES.filter((v: any) => v.cust === c.id).reduce((s: number, v: any) => s + invBal(v), 0);
                const la = lastAct(c.id, null);
                const d = la ? -daysFrom(la.date) : null;
                return (
                  <tr key={c.id} className="clickable" onClick={() => openModal(<Cust360 cid={c.id} />)}>
                    <td className="cell-title">{c.name}<div className="cell-sub" style={{ fontWeight: 400 }}>{c.city}, {c.country}</div></td>
                    <td className="num">{pl ? inrShort(pl) : "—"}</td>
                    <td className="num">{oo ? inrShort(oo) : "—"}</td>
                    <td className="num">{rec ? inrShort(rec) : "—"}</td>
                    <td className="num">{INSTALLED.filter((i: any) => i.cust === c.id).length}</td>
                    <td className="small">{la ? `${d ? d + "d ago" : "Today"} · ${la.type}` : <Pill t="No contact logged" c="warn" />}</td>
                    <td><button className="btn sm">Overview</button></td>
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

/* ---------------- Customer overview (360) ---------------- */
export function Cust360({ cid }: { cid: string }) {
  const c = custBy(cid);
  const inv = arOpen().filter((x: any) => x.v.cust === cid);
  const rec = inv.reduce((s: number, x: any) => s + x.bal, 0);
  const od = inv.filter((x: any) => x.od > 0).reduce((s: number, x: any) => s + x.bal, 0);
  const oo = openOrders().filter((o: any) => o.cust === cid);
  const adv = custAdvances(cid);
  const acts = ACTS.filter((a: any) => a.cust === cid)
    .sort((a: any, b: any) => (b.status === "Open" ? 1 : 0) - (a.status === "Open" ? 1 : 0) || (b.date || b.due) - (a.date || a.due))
    .slice(0, 8);
  const ed = canEdit("crm") || canEdit("receivables");
  const overLimit = c.creditLimit && rec > c.creditLimit;
  const sales = [
    ...LEADS.filter((l: any) => l.cust === cid).map((l: any) => `Lead ${l.id}: ${fgBy[l.item].name} · ${l.stage}`),
    ...QUOTES.filter((q: any) => q.cust === cid).map((q: any) => `Quote ${q.id}: ${inr(quoteValue(q))} · ${q.status}`),
    ...oo.map((o: any) => `Order ${o.id}: ${inr(orderValue(o))} · ${orderStatus(o).t}`),
  ];
  const machines = INSTALLED.filter((i: any) => i.cust === cid);
  return (
    <Modal
      wide
      title={c.name}
      foot={
        <>
          <button className="btn" onClick={closeModal}>Close</button>
          {canEdit("receivables") && <button className="btn" onClick={() => openModal(<CreditModal cid={cid} />)}>Credit terms</button>}
          {canSee("receivables") && (
            <button className="btn" onClick={() => { closeModal(); setUI({ arTab: "ledger", arCust: cid }); go("receivables"); }}>Statement of account</button>
          )}
          {ed && <button className="btn primary" onClick={() => openAct({ cust: cid })}>Log activity</button>}
        </>
      }
    >
      <div className="kpis cb-kpis">
        <div className="kpi"><span className="k-label">Receivable</span><span className="k-value">{inrShort(rec)}</span><span className="k-foot">{od ? <span style={{ color: "var(--bad)" }}>{inrShort(od)} overdue</span> : "Nothing overdue"}</span></div>
        <div className="kpi"><span className="k-label">Open orders</span><span className="k-value">{inrShort(oo.reduce((s: number, o: any) => s + orderValue(o), 0))}</span><span className="k-foot">{oo.length} orders · advances held {inrShort(adv)}</span></div>
        <div className={`kpi ${overLimit ? "alert" : ""}`}><span className="k-label">Credit terms</span><span className="k-value" style={{ fontSize: 18 }}>{creditTxt(c)}</span><span className="k-foot">{overLimit ? "Receivable above limit" : c.country === "India" ? c.state || "" : "Export"}</span></div>
      </div>
      <div className="form-section">
        <h3>Contacts {canEdit("crm") && <button className="btn sm ghost" onClick={() => openModal(<CtModal cust={cid} />)}>Add</button>}</h3>
        {custContacts(cid).map((p: any) => (
          <div className="small" style={{ marginBottom: 6 }} key={p.id}>
            <b>{p.name}</b> · {p.desig} · {p.role}{p.primary ? " · primary" : ""}
            <div className="muted">{p.mobile} · {p.email}</div>
          </div>
        ))}
        {!custContacts(cid).length && <p className="small muted">No contacts yet.</p>}
      </div>
      <div className="form-section">
        <h3>Activities and follow-ups</h3>
        {acts.map((a: any) => (
          <div key={a.id} className={`hist-item ${a.status === "Open" ? "info" : ""}`}>
            <div className="hist-head">
              <b>{a.status === "Open" ? "Follow-up: " + a.subject : a.subject}</b>
              <span className="muted">{a.type} · {USERS[a.by].name}</span>
              <span className="muted small">{a.status === "Open" ? "Due " + ds(a.due) : ds(a.date)}</span>
            </div>
            {a.notes && <div className="hist-note">{a.notes}{a.promise ? ` · Promise ${inr(a.promise.amt)} by ${ds(a.promise.date)}` : ""}</div>}
          </div>
        ))}
        {!acts.length && <p className="small muted">No activities logged.</p>}
      </div>
      <div className="form-section">
        <h3>Open invoices</h3>
        <div className="table-wrap">
          <table className="data">
            <tbody>
              {inv.map((x: any) => (
                <tr key={x.v.id}>
                  <td className="mono small">{x.v.id}<div className="cell-sub">{ds(x.v.date)}</div></td>
                  <td className="num">{inr(x.bal)}</td>
                  <td>{x.od > 0 ? <Pill t={`${x.od}d overdue`} c={x.od > 60 ? "bad" : "warn"} /> : <Pill t="Not due" />}</td>
                </tr>
              ))}
              {!inv.length && <tr><td className="empty">No open invoices.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="form-section">
        <h3>Sales</h3>
        <div className="small">{sales.length ? sales.map((s, i) => <div key={i}>{s}</div>) : <span className="muted">No open sales.</span>}</div>
      </div>
      <div className="form-section">
        <h3>Installed machines</h3>
        <div className="small">
          {machines.length ? machines.map((i: any) => <div key={i.serial}>{fgBy[i.item].name} · <span className="mono">{i.serial}</span> · {amcStatus(i).t}</div>) : <span className="muted">None.</span>}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Activity (log / complete / collection) ---------------- */
export function openAct(p: { cust?: string; ref?: string; ct?: string; type?: string; complete?: string }) {
  const can = canEdit("crm") || canEdit("receivables");
  if (!can) return toast(`${myRole().name} cannot ${p.complete ? "update follow-ups" : "log CRM activities"}.`, true);
  openModal(<ActModal p={p} />);
}

function ActModal({ p }: { p: { cust?: string; ref?: string; ct?: string; type?: string; complete?: string } }) {
  const done = p.complete ? ACTS.find((a: any) => a.id === p.complete) : null;
  const initCust = done ? done.cust : p.cust || CUST[0].id;
  const initType = done ? done.type : p.type || "Call";
  const defCt = (cid: string, type: string) =>
    ((type === "Collection call" ? acctContact(cid) : custContacts(cid).find((x: any) => x.primary)) || {}).id || "";
  const [f, setF] = useState({
    type: initType, cust: initCust, ct: done ? done.contact : p.ct || defCt(initCust, initType), ref: done ? done.ref : p.ref || "",
    date: isoLocal(TODAY), out: initType === "Collection call" ? "Promise to pay" : "", sub: done ? done.subject : "", notes: "",
    pdate: "", pamt: "", next: "", nsub: "",
  });
  const [e, setE] = useState("");
  const set = (k: keyof typeof f) => (x: any) => setF({ ...f, [k]: x.target.value });
  const changeCust = (cid: string) =>
    setF({ ...f, cust: cid, ct: (custContacts(cid).find((x: any) => x.primary) || {}).id || "", ref: "" });

  const save = () => {
    const sub = f.sub.trim();
    if (!sub) return setE("Enter a subject.");
    const pAmt = +f.pamt || 0;
    const rec: any = {
      type: f.type, cust: f.cust, contact: f.ct, ref: f.ref, subject: sub, notes: f.notes.trim(), outcome: f.out,
      date: fromIso(f.date || isoLocal(TODAY)), by: SESSION.user, status: "Done",
    };
    if (f.type === "Collection call" && pAmt > 0 && f.pdate) rec.promise = { amt: pAmt, date: fromIso(f.pdate) };
    if (done) Object.assign(done, rec, { by: done.by });
    else ACTS.push(mkAct(rec));
    const nd = f.next;
    if (nd)
      ACTS.push(mkAct({
        type: f.type === "Collection call" ? "Collection call" : "Call", status: "Open", cust: f.cust, contact: rec.contact, ref: rec.ref,
        subject: f.nsub.trim() || `Follow up: ${sub}`, due: fromIso(nd), by: SESSION.user,
      }));
    if (/^L-/.test(rec.ref)) {
      const l = LEADS.find((x: any) => x.id === rec.ref);
      if (l) {
        l.follow = nd ? fromIso(nd) : null;
        if (l.stage === "New" && ["Positive", "Interested"].includes(rec.outcome)) l.stage = "Qualified";
      }
    }
    closeModal();
    bump();
    toast(`${done ? "Follow-up completed" : f.type + " logged"} for ${custBy(f.cust).name}${nd ? ` · next follow-up ${ds(fromIso(nd))}` : ""}`);
  };

  return (
    <Modal
      title={done ? `Complete follow-up · ${custBy(initCust).name}` : "Log activity"}
      foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>{done ? "Complete" : "Save activity"}</button></>}
    >
      {done && <div className="banner info" style={{ display: "block" }}><b>{done.subject}</b> · due {ds(done.due)}</div>}
      <div className="form-grid">
        <Field id="ac-type" label="Type">
          <select className="input" id="ac-type" value={f.type} onChange={set("type")}>{ACT_TYPES.map((t: string) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field id="ac-cust" label="Customer">
          <select className="input" id="ac-cust" value={f.cust} disabled={!!done} onChange={(x) => changeCust(x.target.value)}><CustOptions /></select>
        </Field>
        <Field id="ac-ct" label="Contact">
          <select className="input" id="ac-ct" value={f.ct} onChange={set("ct")}>
            <option value="">—</option>
            {custContacts(f.cust).map((x: any) => <option key={x.id} value={x.id}>{x.name} · {x.role}</option>)}
          </select>
        </Field>
        <Field id="ac-ref" label="Linked to">
          <select className="input" id="ac-ref" value={f.ref} onChange={set("ref")}>
            <option value="">None</option>
            {custRefs(f.cust).map(([v, t]: any) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Field>
        <Field id="ac-date" label="Date"><input className="input" id="ac-date" type="date" value={f.date} onChange={set("date")} /></Field>
        <Field id="ac-out" label="Outcome">
          <select className="input" id="ac-out" value={f.out} onChange={set("out")}>
            {["", "Positive", "Interested", "Awaiting approval", "Documents requested", "Promise to pay", "Dispute raised", "No response", "Lost"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
      </div>
      <Field id="ac-sub" label="Subject *" err={e}><input className={`input ${e ? "invalid" : ""}`} id="ac-sub" value={f.sub} onChange={set("sub")} /></Field>
      <Field id="ac-notes" label="What was discussed"><textarea className="input" id="ac-notes" rows={3} value={f.notes} onChange={set("notes")} /></Field>
      {f.type === "Collection call" && (
        <div className="form-section">
          <h3>Promise to pay</h3>
          <div className="form-grid">
            <Field id="ac-pdate" label="Promised date"><input className="input" id="ac-pdate" type="date" value={f.pdate} onChange={set("pdate")} /></Field>
            <Field id="ac-pamt" label="Promised amount (₹)"><input className="input num" id="ac-pamt" type="number" min={0} value={f.pamt} onChange={set("pamt")} /></Field>
          </div>
          <p className="small muted">A promise that passes with the invoice still unpaid is flagged as broken on the Receivables screen.</p>
        </div>
      )}
      <div className="form-section">
        <h3>Next follow-up</h3>
        <div className="form-grid">
          <Field id="ac-next" label="Date"><input className="input" id="ac-next" type="date" value={f.next} onChange={set("next")} /></Field>
          <Field id="ac-nsub" label="What to do"><input className="input" id="ac-nsub" value={f.nsub} onChange={set("nsub")} placeholder="e.g. Call for PO status" /></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Contact ---------------- */
export function CtModal({ id, cust }: { id?: string; cust?: string }) {
  const c = id ? ctBy(id) : null;
  const [f, setF] = useState({
    cust: c ? c.cust : cust || CUST[0].id, name: c?.name || "", desig: c?.desig || "", role: c?.role || CT_ROLES[0],
    mob: c?.mobile || "", mail: c?.email || "", pri: !!c?.primary,
  });
  const [e, setE] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (x: any) => setF({ ...f, [k]: x.target.value });
  const save = () => {
    if (!canEdit("crm")) return toast(`${myRole().name} has view-only access to CRM desk.`, true);
    const name = f.name.trim(), mob = f.mob.trim(), mail = f.mail.trim();
    const errs: Record<string, string> = {};
    if (!name) errs.name = "Enter the name.";
    if (mob.replace(/\D/g, "").length < 10) errs.mob = "Enter a mobile number with at least 10 digits.";
    if (mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) errs.mail = "Enter a valid e-mail.";
    setE(errs);
    if (Object.keys(errs).length) return;
    const data = { cust: f.cust, name, desig: f.desig.trim(), role: f.role, mobile: mob, email: mail, primary: f.pri };
    if (data.primary) CONTACTS.filter((x: any) => x.cust === data.cust).forEach((x: any) => (x.primary = false));
    if (c) Object.assign(c, data);
    else CONTACTS.push({ id: "P" + String(SEQ.ct++).padStart(2, "0"), ...data });
    closeModal();
    bump();
    toast(`${name} saved`);
  };
  return (
    <Modal title={c ? `Edit contact · ${c.name}` : "Add contact"} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Save contact</button></>}>
      <div className="form-grid">
        <Field id="ct-cust" label="Customer"><select className="input" id="ct-cust" value={f.cust} onChange={set("cust")}><CustOptions /></select></Field>
        <Field id="ct-name" label="Name *" err={e.name}><input className={`input ${e.name ? "invalid" : ""}`} id="ct-name" value={f.name} onChange={set("name")} /></Field>
        <Field id="ct-desig" label="Designation"><input className="input" id="ct-desig" value={f.desig} onChange={set("desig")} /></Field>
        <Field id="ct-role" label="Role in buying"><select className="input" id="ct-role" value={f.role} onChange={set("role")}>{CT_ROLES.map((r: string) => <option key={r}>{r}</option>)}</select></Field>
        <Field id="ct-mob" label="Mobile *" err={e.mob}><input className={`input ${e.mob ? "invalid" : ""}`} id="ct-mob" value={f.mob} onChange={set("mob")} /></Field>
        <Field id="ct-mail" label="E-mail" err={e.mail}><input className={`input ${e.mail ? "invalid" : ""}`} id="ct-mail" type="email" value={f.mail} onChange={set("mail")} /></Field>
      </div>
      <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={f.pri} onChange={(x) => setF({ ...f, pri: x.target.checked })} style={{ width: 16, height: 16, accentColor: "var(--primary)" }} /> Primary contact for this customer
      </label>
    </Modal>
  );
}

/* ---------------- Credit terms ---------------- */
export function CreditModal({ cid }: { cid: string }) {
  const c = custBy(cid);
  const [days, setDays] = useState(String(c.creditDays || 0));
  const [lim, setLim] = useState(String(c.creditLimit || 0));
  const save = () => {
    c.creditDays = Math.max(0, parseInt(days) || 0);
    c.creditLimit = Math.max(0, +lim || 0);
    closeModal();
    bump();
    toast(`Credit terms for ${c.name}: ${creditTxt(c)}`);
  };
  return (
    <Modal title={`Credit terms · ${c.name}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
      <div className="form-grid">
        <Field id="cr-days" label="Credit days (0 = advance / LC)"><input className="input num" id="cr-days" type="number" min={0} max={180} value={days} onChange={(x) => setDays(x.target.value)} /></Field>
        <Field id="cr-lim" label="Credit limit (₹)"><input className="input num" id="cr-lim" type="number" min={0} step={100000} value={lim} onChange={(x) => setLim(x.target.value)} /></Field>
      </div>
      <p className="small muted">New invoices take their due date from the credit days. Sales sees a warning when a customer is overdue or above the limit.</p>
    </Modal>
  );
}
