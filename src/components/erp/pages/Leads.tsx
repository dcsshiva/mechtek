import { useState } from "react";
import { CUST, LEADS, LEAD_STAGES, SEQ, custBy, fgBy, leadValue } from "@/erp/engine";
import { TODAY, addDays, daysFrom, fromIso, inrShort, isoLocal } from "@/erp/format";
import { canEdit, denyReason, myRole } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { go } from "@/erp/nav";
import { ErrLine, Field, Modal, PageHead, Pill, closeModal, openModal, toast } from "../ui";
import { CustOptions, FgOptions } from "./common";
import { openQuote } from "./Quotes";
import { openAct } from "./Crm";

export function LeadsPage() {
  useErp();
  const setStage = (l: any, v: string) => {
    if (!canEdit("leads")) return toast(`${myRole().name} has view-only access to Leads.`, true);
    l.stage = v;
    if (["Won", "Lost"].includes(l.stage)) l.follow = null;
    bump();
    toast(`${l.id} moved to ${l.stage}`);
  };
  return (
    <>
      <PageHead
        route="leads"
        title="Leads"
        desc="Enquiries from the website, expos, dealers and the installed base. Change the stage or create a quotation from a lead."
        actions={[<button key="n" className="btn primary" onClick={openLead}>New lead</button>]}
      />
      <div className="kanban">
        {LEAD_STAGES.map((st: string) => {
          const ls = LEADS.filter((l: any) => l.stage === st);
          return (
            <div className="k-col" key={st}>
              <div className="k-col-head"><span>{st}</span><span>{ls.length}</span></div>
              {ls.map((l: any) => {
                const c = custBy(l.cust), f = fgBy[l.item], fd = l.follow ? daysFrom(l.follow) : null;
                return (
                  <article className="k-card" key={l.id}>
                    <div className="k-title">{c.name}</div>
                    <div className="small">{l.note ? l.note : `${l.qty} × ${f.name}`}</div>
                    <div className="k-meta"><span>{inrShort(leadValue(l))}</span><span>{l.source}</span></div>
                    {fd !== null && (
                      <div>
                        <Pill t={fd < 0 ? `Follow-up overdue ${-fd}d` : fd === 0 ? "Follow up today" : `Follow up in ${fd}d`} c={fd < 0 ? "bad" : fd === 0 ? "warn" : ""} />
                      </div>
                    )}
                    <div className="k-actions">
                      <label className="sr-only" htmlFor={`st-${l.id}`}>Stage</label>
                      <select className="input" id={`st-${l.id}`} value={l.stage} onChange={(e) => setStage(l, e.target.value)} style={{ minHeight: 30, padding: "3px 8px", fontSize: 12.5, width: "auto" }}>
                        {LEAD_STAGES.map((s: string) => <option key={s}>{s}</option>)}
                      </select>
                      {["New", "Qualified"].includes(l.stage) && !l.note && (
                        <button className="btn sm" onClick={() => openQuote({ cust: l.cust, lead: l.id, lines: [{ item: l.item, qty: l.qty }] })}>Create quote</button>
                      )}
                      {canEdit("crm") && !["Won", "Lost"].includes(l.stage) && (
                        <button className="btn sm ghost" onClick={() => openAct({ cust: l.cust, ref: l.id })}>Log</button>
                      )}
                    </div>
                  </article>
                );
              })}
              {!ls.length && <div className="k-empty">No leads</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function openLead() {
  const deny = denyReason("leads");
  if (deny) return toast(deny, true);
  openModal(<LeadModal />);
}

function LeadModal() {
  const [f, setF] = useState({ cust: "C006", nn: "", city: "", item: "FG-DBA", qty: "1", src: "Website", fu: isoLocal(addDays(TODAY, 2)) });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (x: any) => setF({ ...f, [k]: x.target.value });
  const save = () => {
    let cust = f.cust;
    const nn = f.nn.trim();
    if (!cust && !nn) return setErr("Pick a customer or type a new customer name.");
    if (!cust) {
      const [city, country] = (f.city || "").split(",").map((s) => s && s.trim());
      cust = "C" + String(CUST.length + 1).padStart(3, "0");
      CUST.push({ id: cust, name: nn, city: city || "—", country: country || "India", contact: "—" });
    }
    LEADS.push({
      id: "L-" + SEQ.lead++, cust, item: f.item, qty: Math.max(1, +f.qty || 1), source: f.src, stage: "New",
      follow: f.fu ? fromIso(f.fu) : null,
    });
    closeModal();
    bump();
    go("leads");
    toast("Lead saved");
  };
  return (
    <Modal title="New lead" foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Save lead</button></>}>
      <div className="form-grid">
        <Field id="ld-cust" label="Customer">
          <select className="input" id="ld-cust" value={f.cust} onChange={set("cust")}><option value="">New customer…</option><CustOptions /></select>
        </Field>
        <Field id="ld-new" label="New customer name"><input className="input" id="ld-new" value={f.nn} onChange={set("nn")} placeholder="Only if not in the list" /></Field>
        <Field id="ld-city" label="City, country"><input className="input" id="ld-city" value={f.city} onChange={set("city")} placeholder="e.g. Chennai, India" /></Field>
        <Field id="ld-item" label="Product of interest"><select className="input" id="ld-item" value={f.item} onChange={set("item")}><FgOptions /></select></Field>
        <Field id="ld-qty" label="Quantity"><input className="input" id="ld-qty" type="number" min={1} value={f.qty} onChange={set("qty")} /></Field>
        <Field id="ld-src" label="Source">
          <select className="input" id="ld-src" value={f.src} onChange={set("src")}>
            {["Website", "CPhi expo", "P-MEC expo", "Dealer", "Repeat customer", "Installed-base alert"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field id="ld-fu" label="Next follow-up"><input className="input" id="ld-fu" type="date" value={f.fu} onChange={set("fu")} /></Field>
      </div>
      <ErrLine msg={err} />
    </Modal>
  );
}
