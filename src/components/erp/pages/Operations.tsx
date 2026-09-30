// Operations: material planning, work orders, dispatch, installed base & service.
import { useState } from "react";
import {
  BOM, DCS, INDENTS, INSTALLED, LEADS, MRS, ORDERS, SEQ, STAFF, TICKETS, WOS,
  amcStatus, custBy, fgBy, mk, mrp, openOrders, readyLines, rmBy, roleBy, stockMove, supplyType, woOf, woStages,
} from "@/erp/engine";
import { TODAY, addDays, daysFrom, ds, fromIso, isoLocal, qfmt } from "@/erp/format";
import { UI, canEdit, canSee, setUI } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { go } from "@/erp/nav";
import { DocPill, ErrLine, Field, Modal, PageHead, Pill, Stages, closeModal, openModal, toast } from "../ui";
import { ItemsSummary, OrdersTable } from "./common";
import { DispatchModal } from "./Orders";
import { InvoiceModal } from "./Invoices";
import { IndentDetail, openIndent } from "./Purchase";
import { allow } from "./proc";

/* ================= Material planning ================= */
export function MrpPage() {
  useErp();
  const oo = openOrders();
  if (!UI.mrpSel) UI.mrpSel = new Set(oo.map((o: any) => o.id));
  const res = UI.mrpRun;
  const toggle = (id: string, on: boolean) => { const s = new Set(UI.mrpSel); if (on) s.add(id); else s.delete(id); setUI({ mrpSel: s, mrpRun: null }); };
  const run = () => { setUI({ mrpRun: mrp([...UI.mrpSel]) }); toast("Material planning complete"); };
  const raise = () => {
    const shorts = (UI.mrpRun || []).filter((x: any) => x.short > 0);
    openIndent({ source: "Material planning", dept: "Stores & purchase", reason: `Shortages for ${[...UI.mrpSel].join(", ")}`, lines: shorts.map((x: any) => ({ rm: x.r.code, qty: Math.ceil(x.short) })) });
  };
  const fromMrp = INDENTS.filter((d: any) => d.source === "Material planning").slice(-5).reverse();
  return (
    <>
      <PageHead route="mrp" title="Material planning" desc="Explode the BOMs of selected sales orders, net against stock and open indents and POs, and raise an indent for the shortages."
        actions={canSee("planning") ? [<button key="p" className="btn" onClick={() => go("planning")}>Procurement planning (reorder + demand)</button>] : undefined} />
      <section className="card">
        <div className="card-head"><h2>1 · Select sales orders</h2><button className="btn primary" onClick={() => allow("mrp") && run()}>Run material planning</button></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th style={{ width: 40 }}><span style={{ position: "absolute", left: -9999 }}>Include</span></th><th>Order</th><th>Customer</th><th>Items</th><th>Material status</th></tr></thead>
            <tbody>
              {oo.map((o: any) => {
                const allIssued = o.lines.filter(mk).every((l: any) => { const w = woOf(o, l); return w && w.issued; });
                return (
                  <tr key={o.id}>
                    <td><input type="checkbox" checked={UI.mrpSel.has(o.id)} onChange={(e) => toggle(o.id, e.target.checked)} aria-label={`Include ${o.id}`} style={{ width: 16, height: 16, accentColor: "var(--primary)" }} /></td>
                    <td className="mono cell-title">{o.id}</td><td>{custBy(o.cust).name}</td><td><ItemsSummary lines={o.lines} /></td>
                    <td>{allIssued ? <Pill t="Already issued" c="ok" /> : <Pill t="To be issued" c="warn" />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {res ? (
        <section className="card">
          <div className="card-head">
            <h2>2 · Material requirement</h2>
            <div className="actions">
              <span className="small muted" style={{ alignSelf: "center" }}>{res.filter((x: any) => x.short > 0).length} of {res.length} items short</span>
              {canEdit("indent") && <button className="btn primary" onClick={raise} disabled={!res.some((x: any) => x.short > 0)}>Raise indent for shortages</button>}
            </div>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>RM code</th><th>Description</th><th className="num">Required</th><th className="num">On hand</th><th className="num">On order</th><th className="num">Shortage</th><th>UoM</th><th>Status</th></tr></thead>
              <tbody>
                {res.map((x: any) => (
                  <tr key={x.r.code}>
                    <td className="mono">{x.r.code}</td><td>{x.r.name}</td><td className="num">{qfmt(x.qty)}</td>
                    <td className="num">{x.r.service ? "—" : qfmt(x.onHand)}</td><td className="num">{x.onOrder ? qfmt(x.onOrder) : "—"}</td>
                    <td className="num" style={x.short > 0 ? { color: "var(--bad)", fontWeight: 600 } : undefined}>{x.short > 0 ? qfmt(x.short) : "—"}</td>
                    <td>{x.r.uom}</td>
                    <td>{x.r.service ? <Pill t="Job work" /> : x.short > 0 ? <Pill t="Short" c="bad" /> : <Pill t="Covered" c="ok" />}</td>
                  </tr>
                ))}
                {!res.length && <tr><td colSpan={8} className="empty">No material needed: all selected orders are already issued.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="card"><div className="empty">Select orders and run material planning to see requirements and shortages.</div></div>
      )}
      <section className="card">
        <div className="card-head"><h2>Indents from material planning</h2><button className="btn ghost sm" onClick={() => go("indent")}>All indents</button></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Indent</th><th>Materials</th><th>Status</th></tr></thead>
            <tbody>
              {fromMrp.map((d: any) => (
                <tr key={d.id} className="clickable" onClick={() => openModal(<IndentDetail id={d.id} />)}>
                  <td className="mono cell-title">{d.id}<div className="cell-sub" style={{ fontFamily: "var(--sans)" }}>{ds(d.date)}</div></td>
                  <td>{d.lines.map((l: any, i: number) => <div key={i}>{qfmt(l.qty)} {rmBy[l.rm].uom} · {rmBy[l.rm].name}</div>)}</td>
                  <td><DocPill st={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ================= Work orders ================= */
export function WorkOrdersPage() {
  useErp();
  const pending = openOrders().filter((o: any) => o.advance).flatMap((o: any) => o.lines.filter((l: any) => mk(l) && !woOf(o, l)).map((l: any) => ({ o, l })));
  const active = WOS.filter((w: any) => { const o = ORDERS.find((x: any) => x.id === w.so); return o && !o.dispatched; });
  const release = () => {
    if (!allow("workorders")) return;
    let n = 0;
    const held: string[] = [];
    openOrders().forEach((o: any) => {
      const need = o.lines.filter((l: any) => mk(l) && !woOf(o, l));
      if (!need.length) return;
      if (!o.advance) { held.push(o.id); return; }
      need.forEach((l: any) => { WOS.push({ id: "WO-" + SEQ.wo++, so: o.id, item: l.item, qty: l.qty, stage: 0, issued: false, ln: o.lines.indexOf(l) }); n++; });
    });
    bump();
    toast(`${n} work order${n === 1 ? "" : "s"} released${held.length ? `; ${held.join(", ")} held until the advance is received` : ""}`, !n && held.length > 0);
  };
  const advance = (w: any) => {
    if (!allow("workorders")) return;
    const st = woStages(w);
    const issueIdx = st.indexOf("Material issue");
    const mrDone = MRS.some((m: any) => m.wo === w.id && m.status === "Issued");
    if (w.stage === issueIdx && !w.issued && mrDone) { w.issued = true; toast(`Material for ${w.id} already issued through requisition`); }
    if (w.stage === issueIdx && !w.issued) {
      const need = (BOM[w.item] || []).map((b: any) => ({ r: rmBy[b[1]], q: b[2] * w.qty })).filter((x: any) => !x.r.service);
      const short = need.filter((x: any) => x.r.onHand < x.q);
      if (short.length) return toast(`Cannot issue material: ${short.length} item${short.length > 1 ? "s" : ""} short (e.g. ${short[0].r.name}). Run material planning and record receipts.`, true);
      need.forEach((x: any) => stockMove(x.r.code, -x.q, "Issue to work order", w.id));
      w.issued = true;
      toast(`Material issued for ${w.id}: ${need.length} items`);
    }
    w.stage = Math.min(st.length - 1, w.stage + 1);
    if (w.stage === st.length - 1) toast(`${w.id} is ready for dispatch`);
    bump();
  };
  return (
    <>
      <PageHead route="workorders" title="Work orders" desc="Production jobs by stage. Material is issued from stock when a job moves past the material-issue stage."
        actions={pending.length ? [<button key="r" className="btn primary" onClick={release}>Release {pending.length} work order{pending.length > 1 ? "s" : ""}</button>] : undefined} />
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Work order</th><th>Sales order</th><th>Item</th><th className="num">Qty</th><th>Progress</th><th>Due</th><th></th></tr></thead>
            <tbody>
              {active.map((w: any) => {
                const st = woStages(w);
                const o = ORDERS.find((x: any) => x.id === w.so);
                const done = w.stage === st.length - 1;
                const d = daysFrom(o.due);
                return (
                  <tr key={w.id}>
                    <td className="mono cell-title">{w.id}</td>
                    <td className="mono">{w.so}<div className="cell-sub" style={{ fontFamily: "var(--sans)" }}>{custBy(o.cust).name}</div></td>
                    <td>{fgBy[w.item].name}</td><td className="num">{w.qty}</td>
                    <td><Stages stages={st} stage={w.stage} /><div className="stage-label">{done ? "Ready" : `Step ${w.stage + 1} of ${st.length}: ${st[w.stage]}`}</div></td>
                    <td className="nowrap">{ds(o.due)}<div className="cell-sub">{d < 0 ? <Pill t={`${-d} days late`} c="bad" /> : `in ${d} days`}</div></td>
                    <td className="nowrap">{done ? <Pill t="Ready" c="ok" /> : <button className="btn sm primary" onClick={() => advance(w)}>Complete {st[w.stage]}</button>}</td>
                  </tr>
                );
              })}
              {!active.length && <tr><td colSpan={7} className="empty">No active work orders.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ================= Dispatch ================= */
export function DispatchPage() {
  useErp();
  const ready = openOrders().filter((o: any) => readyLines(o).length);
  const inProd = openOrders().filter((o: any) => !readyLines(o).length);
  return (
    <>
      <PageHead route="dispatch" title="Dispatch" desc="Ship items that have passed QC, in full or in part. Each dispatch creates a delivery challan and a GST tax invoice; machines then wait for installation." />
      <section className="card">
        <div className="card-head"><h2>Ready to dispatch</h2><span className="small muted">{ready.length} orders</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Order</th><th>Customer</th><th>Ready now</th><th>Not ready yet</th><th>Supply</th><th></th></tr></thead>
            <tbody>
              {ready.map((o: any) => {
                const c = custBy(o.cust);
                const rl = readyLines(o);
                const rest = o.lines.filter((l: any) => !rl.includes(l) && (l.disp || 0) < l.qty);
                const sup = supplyType(c);
                return (
                  <tr key={o.id}>
                    <td className="mono cell-title">{o.id}<div className="cell-sub" style={{ fontFamily: "var(--sans)" }}>PO {o.custPO || "—"}</div></td>
                    <td>{c.name}<div className="cell-sub">{c.city}, {c.country}</div></td>
                    <td style={{ minWidth: 180 }}>{rl.map((l: any, i: number) => <div key={i}>{l.qty - (l.disp || 0)} × {fgBy[l.item].name}</div>)}</td>
                    <td style={{ minWidth: 160 }} className="muted">{rest.length ? rest.map((l: any, i: number) => <div key={i}>{l.qty - (l.disp || 0)} × {fgBy[l.item].name}</div>) : "—"}</td>
                    <td className="small nowrap">{sup === "intra" ? "CGST + SGST" : sup === "inter" ? "IGST" : "Export (LUT)"}</td>
                    <td>{canEdit("dispatch") && <button className="btn sm primary" onClick={() => allow("dispatch") && openModal(<DispatchModal id={o.id} />)}>Prepare dispatch</button>}</td>
                  </tr>
                );
              })}
              {!ready.length && <tr><td colSpan={6} className="empty">Nothing is ready. Move work orders to Ready first.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h2>Dispatches</h2><span className="small muted">Delivery challans with their GST invoices</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Challan</th><th>Order · customer</th><th>Items</th><th>Transport</th><th>Invoice</th></tr></thead>
            <tbody>
              {DCS.slice().reverse().map((d: any) => {
                const o = ORDERS.find((x: any) => x.id === d.so);
                return (
                  <tr key={d.id}>
                    <td className="mono cell-title">{d.id}<div className="cell-sub" style={{ fontFamily: "var(--sans)" }}>{ds(d.date)}</div></td>
                    <td><span className="mono">{d.so}</span><div className="cell-sub">{custBy(o.cust).name}</div></td>
                    <td>{d.lines.map((l: any, i: number) => <div key={i}>{l.qty} × {fgBy[l.item].name}</div>)}</td>
                    <td className="small">{d.transporter} · {d.vehicle}{d.ewb && <div className="cell-sub">EWB {d.ewb}</div>}{d.sb && <div className="cell-sub">SB {d.sb}</div>}</td>
                    <td>{canSee("invoices") ? <button className="btn sm" onClick={() => openModal(<InvoiceModal id={d.inv} />)}>{d.inv}</button> : <span className="mono small">{d.inv}</span>}</td>
                  </tr>
                );
              })}
              {!DCS.length && <tr><td colSpan={5} className="empty">No dispatches yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h2>Still in production</h2></div>
        <div className="table-wrap"><OrdersTable list={inProd} /></div>
      </section>
    </>
  );
}

/* ================= Installed base & service ================= */
export function ServicePage() {
  useErp();
  const due = INSTALLED.filter((i: any) => !i.pending && ["warn", "bad"].includes(amcStatus(i).c)).length;
  const amcLead = (i: any) => {
    if (!allow("leads")) return;
    LEADS.push({
      id: "L-" + SEQ.lead++, cust: i.cust, item: i.item, qty: 1, note: `AMC renewal · ${fgBy[i.item].name} (${i.serial})`,
      value: Math.round(fgBy[i.item].price * 0.06), source: "Installed-base alert", stage: "New", follow: addDays(TODAY, 1),
    });
    bump(); toast(`Renewal lead created for ${custBy(i.cust).name}`);
  };
  const closeTicket = (t: any) => {
    if (!allow("service")) return;
    t.status = "Closed"; bump(); toast(`${t.id} closed`);
  };
  return (
    <>
      <PageHead route="service" title="Installed base & service" desc="Every machine Mechtek has supplied, with warranty and AMC status, and open service tickets."
        actions={[<button key="t" className="btn primary" onClick={() => allow("service") && openModal(<TicketModal />)}>New service ticket</button>]} />
      <div className="kpis">
        <div className="kpi"><span className="k-label">Machines in the field</span><span className="k-value">{INSTALLED.length}</span><span className="k-foot">across {new Set(INSTALLED.map((i: any) => custBy(i.cust).country)).size} countries</span></div>
        <div className={`kpi ${due ? "warn" : ""}`}><span className="k-label">AMC renewals to act on</span><span className="k-value">{due}</span><span className="k-foot">expired or due within 60 days</span></div>
        <div className="kpi"><span className="k-label">Open tickets</span><span className="k-value">{TICKETS.filter((t: any) => t.status !== "Closed").length}</span><span className="k-foot">{TICKETS.length} in total</span></div>
      </div>
      <section className="card">
        <div className="card-head"><h2>Installed base</h2></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Serial no.</th><th>Machine</th><th>Customer</th><th>Installed</th><th>Cover until</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {INSTALLED.slice().sort((a: any, b: any) => amcStatus(a).d - amcStatus(b).d).map((i: any) => {
                const a = amcStatus(i);
                const c = custBy(i.cust);
                return (
                  <tr key={i.serial}>
                    <td className="mono">{i.serial}</td><td>{fgBy[i.item].name}</td><td>{c.name}<div className="cell-sub">{c.country}</div></td>
                    <td className="nowrap">{i.pending ? <span className="muted">Awaiting installation</span> : ds(i.installed)}{i.dc && <div className="cell-sub">Shipped on {i.dc}</div>}</td>
                    <td className="nowrap">{i.pending ? <span className="muted">Starts at installation</span> : ds(i.amcTo)}</td>
                    <td><Pill t={a.t} c={a.c} /></td>
                    <td>
                      {i.pending
                        ? canEdit("service") && <button className="btn sm primary" onClick={() => openModal(<InstallModal serial={i.serial} />)}>Record installation</button>
                        : a.c !== "ok" && <button className="btn sm" onClick={() => amcLead(i)}>Create renewal lead</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h2>Service tickets</h2></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Ticket</th><th>Machine</th><th>Issue</th><th>Opened</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {TICKETS.slice().reverse().map((t: any) => {
                const m = INSTALLED.find((i: any) => i.serial === t.serial);
                return (
                  <tr key={t.id}>
                    <td className="mono cell-title">{t.id}</td>
                    <td>{fgBy[m.item].name}<div className="cell-sub">{custBy(m.cust).name} · <span className="mono">{m.serial}</span></div></td>
                    <td>{t.issue}</td><td className="nowrap">{ds(t.opened)}</td>
                    <td><Pill t={t.status} c={t.status === "Closed" ? "ok" : "info"} /></td>
                    <td>{t.status !== "Closed" && <button className="btn sm" onClick={() => closeTicket(t)}>Close</button>}</td>
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

function InstallModal({ serial }: { serial: string }) {
  const m = INSTALLED.find((x: any) => x.serial === serial);
  const engs = STAFF.filter((x: any) => x.active && roleBy(x.role).perms.service === "full");
  const [date, setDate] = useState(isoLocal(TODAY));
  const [eng, setEng] = useState(engs[0]?.id || "");
  const [iq, setIq] = useState(false);
  const [tr, setTr] = useState(false);
  const [err, setErr] = useState("");
  const save = () => {
    if (!allow("service")) return;
    if (!iq) return setErr("IQ/OQ must be completed before the machine is handed over.");
    const d = fromIso(date);
    m.installed = d; m.amcTo = addDays(d, 365); m.warranty = true; m.pending = false; m.engineer = eng; m.trained = tr;
    closeModal(); bump(); toast(`${m.serial} installed; warranty until ${ds(m.amcTo)}`);
  };
  return (
    <Modal title={`Record installation · ${m.serial}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Save installation</button></>}>
      <p>{fgBy[m.item].name} at {custBy(m.cust).name}, {custBy(m.cust).city}</p>
      <div className="form-grid">
        <Field id="ins-date" label="Installed on"><input className="input" id="ins-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field id="ins-eng" label="Engineer">
          <select className="input" id="ins-eng" value={eng} onChange={(e) => setEng(e.target.value)}>{engs.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        </Field>
      </div>
      <div className="check-list">
        <label htmlFor="ins-iq"><input type="checkbox" id="ins-iq" checked={iq} onChange={(e) => setIq(e.target.checked)} /> IQ/OQ protocol completed and signed by the customer</label>
        <label htmlFor="ins-tr"><input type="checkbox" id="ins-tr" checked={tr} onChange={(e) => setTr(e.target.checked)} /> Operator training given</label>
      </div>
      <ErrLine msg={err} />
      <p className="small muted">The 12-month warranty starts from the installation date.</p>
    </Modal>
  );
}

function TicketModal() {
  const [serial, setSerial] = useState(INSTALLED[0]?.serial || "");
  const [issue, setIssue] = useState("");
  const [err, setErr] = useState("");
  const save = () => {
    if (!allow("service")) return;
    if (!issue.trim()) return setErr("Describe the issue before creating the ticket.");
    TICKETS.push({ id: "SR-" + SEQ.tk++, serial, issue: issue.trim(), opened: new Date(TODAY), status: "Open" });
    closeModal(); bump(); toast("Service ticket created");
  };
  return (
    <Modal title="New service ticket" foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Create ticket</button></>}>
      <div className="form-grid">
        <Field id="tk-m" label="Machine" span>
          <select className="input" id="tk-m" value={serial} onChange={(e) => setSerial(e.target.value)}>
            {INSTALLED.map((i: any) => <option key={i.serial} value={i.serial}>{i.serial} · {fgBy[i.item].name} · {custBy(i.cust).name}</option>)}
          </select>
        </Field>
        <Field id="tk-issue" label="Issue reported" span>
          <textarea className="input" id="tk-issue" rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe the problem" />
        </Field>
      </div>
      <ErrLine msg={err} />
    </Modal>
  );
}
