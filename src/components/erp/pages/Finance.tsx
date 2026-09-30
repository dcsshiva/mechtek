// Finance: receivables (ageing, collections, reminders, statement of account) and payables (due list, payment run, vendor ledger).
import { useState, type ReactNode } from "react";
import {
  ACTS, BILLS, BUCKETS, COMPANY, CUST, DEBITS, INVOICES, ORDERS, PEND, SESSION,
  acctContact, apOpen, arOpen, billCalc, billBal, billPaid, billPayable, bucketOf, creditTxt, custAdvances, custBy, lastAct, logD, mkAct, promiseOf, venBy,
} from "@/erp/engine";
import { TODAY, daysFrom, ds, fromIso, inr, inrShort, isoLocal } from "@/erp/format";
import { UI, canEdit, setUI } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { go } from "@/erp/nav";
import { ErrLine, Field, Modal, PageHead, Pill, Seg, closeModal, openModal, toast } from "../ui";
import { CustOptions } from "./common";
import { Cust360, openAct } from "./Crm";
import { InvoiceModal, PayModal } from "./Invoices";
import { BillDetail } from "./Purchase";
import { VenOptions, allow, numOf } from "./proc";

/* ---------------- Ageing helpers ---------------- */
function AgeBars({ tot }: { tot: number[] }) {
  const max = Math.max(1, ...tot);
  return (
    <div className="hbar-list">
      {BUCKETS.map((b: string, i: number) => (
        <div key={b} className="hbar">
          <span className="lbl">{i ? b + " days overdue" : b}</span>
          <div className="track"><div className="fill" style={{ width: `${((tot[i] / max) * 100).toFixed(1)}%`, background: i >= 3 ? "var(--bad)" : i >= 1 ? "var(--warn)" : undefined }} /></div>
          <span className="val">{inrShort(tot[i])}</span>
        </div>
      ))}
    </div>
  );
}

type AgeRow = { key: string; b: number[]; name: string; sub: ReactNode };
function AgeTable({ rows, nameHead, extraHead, extraCell, onRow }: {
  rows: AgeRow[]; nameHead: string; extraHead?: string; extraCell?: (r: AgeRow) => ReactNode; onRow: (r: AgeRow) => void;
}) {
  const tot = [0, 0, 0, 0, 0];
  rows.forEach((r) => r.b.forEach((x, i) => (tot[i] += x)));
  const sum = tot.reduce((s, x) => s + x, 0);
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr><th>{nameHead}</th>{BUCKETS.map((b: string, i: number) => <th key={b} className="num">{i ? b + " days" : b}</th>)}<th className="num">Total</th>{extraHead && <th>{extraHead}</th>}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="clickable" onClick={() => onRow(r)}>
              <td style={{ minWidth: 170 }}><div className="cell-title">{r.name}</div><div className="cell-sub">{r.sub}</div></td>
              {r.b.map((x, i) => (
                <td key={i} className="num" style={x && i >= 3 ? { color: "var(--bad)", fontWeight: 600 } : x && i >= 1 ? { color: "var(--warn)" } : undefined}>{x ? inr(x) : "—"}</td>
              ))}
              <td className="num cell-title">{inr(r.b.reduce((s, x) => s + x, 0))}</td>
              {extraCell && extraCell(r)}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7 + (extraHead ? 1 : 0)} className="empty">Nothing outstanding.</td></tr>}
        </tbody>
        <tfoot>
          <tr><td>Total</td>{tot.map((x, i) => <td key={i} className="num">{x ? inr(x) : "—"}</td>)}<td className="num">{inr(sum)}</td>{extraHead && <td></td>}</tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ================= Receivables ================= */
function arRows(): AgeRow[] {
  const by: Record<string, number[]> = {};
  arOpen().forEach((x: any) => { const c = x.v.cust; (by[c] = by[c] || [0, 0, 0, 0, 0])[bucketOf(x.od)] += x.bal; });
  const sumOd = (b: number[]) => b.slice(1).reduce((s, x) => s + x, 0);
  return Object.entries(by).map(([cid, b]) => ({ key: cid, b, name: custBy(cid).name, sub: creditTxt(custBy(cid)) })).sort((a, b) => sumOd(b.b) - sumOd(a.b));
}
function receipts() {
  const r: any[] = [];
  INVOICES.forEach((v: any) => v.pays.forEach((p: any) => r.push({ date: p.date, cust: v.cust, doc: v.id, kind: "Invoice payment", amt: p.amt, mode: p.mode, ref: p.ref })));
  ORDERS.forEach((o: any) => (o.payments || []).forEach((p: any) => r.push({ date: p.date, cust: o.cust, doc: o.id, kind: "Advance", amt: p.amt, mode: p.mode, ref: p.ref })));
  return r.sort((a, b) => b.date - a.date);
}
const dunLevel = (od: number) => (od > 45 ? "Final reminder" : od > 15 ? "Second reminder" : "Friendly reminder");

export function ReceivablesPage() {
  useErp();
  const tab = UI.arTab;
  const open = arOpen();
  const tot = [0, 0, 0, 0, 0];
  open.forEach((x: any) => (tot[bucketOf(x.od)] += x.bal));
  const all = tot.reduce((s, x) => s + x, 0), od = all - tot[0], o60 = tot[3] + tot[4];
  const sales90 = INVOICES.filter((v: any) => daysFrom(v.date) >= -90).reduce((s: number, v: any) => s + v.total, 0);
  const dso = sales90 ? Math.round((all / sales90) * 90) : 0;
  const month = receipts().filter((r) => r.date.getMonth() === TODAY.getMonth() && r.date.getFullYear() === TODAY.getFullYear()).reduce((s, r) => s + r.amt, 0);
  const broken = open.filter((x: any) => { const p = promiseOf(x.v); return p && p.broken; }).length;
  const ed = canEdit("receivables");
  return (
    <>
      <PageHead route="receivables" title="Receivables" desc="What customers owe, how old it is, and the follow-up on every overdue invoice. Advances held against open orders are shown separately." />
      <div className="kpis">
        <div className="kpi"><span className="k-label">Total receivable</span><span className="k-value">{inrShort(all)}</span><span className="k-foot">{open.length} open invoices</span></div>
        <div className={`kpi ${od ? "warn" : ""}`}><span className="k-label">Overdue</span><span className="k-value">{inrShort(od)}</span><span className="k-foot">{all ? Math.round((od / all) * 100) : 0}% of receivable · {inrShort(o60)} over 60 days</span></div>
        <div className="kpi"><span className="k-label">Days sales outstanding</span><span className="k-value">{dso}</span><span className="k-foot">on last 90 days' invoicing</span></div>
        <div className={`kpi ${broken ? "alert" : ""}`}><span className="k-label">Collected this month</span><span className="k-value">{inrShort(month)}</span><span className="k-foot">{broken ? `${broken} promise${broken > 1 ? "s" : ""} to pay broken` : "advances and invoice payments"}</span></div>
      </div>
      <div className="toolbar">
        <Seg wrap value={tab} onChange={(v) => setUI({ arTab: v })} options={[["ageing", "Ageing by customer"], ["open", `Open invoices (${open.length})`], ["receipts", "Receipts"], ["ledger", "Customer ledger"]]} />
      </div>
      {tab === "ageing" && (
        <>
          <div className="grid-2">
            <section className="card"><div className="card-head"><h2>Ageing summary</h2><span className="small muted">Days past the due date</span></div><div className="card-body"><AgeBars tot={tot} /></div></section>
            <section className="card">
              <div className="card-head"><h2>Advances held</h2><span className="small muted">Received against orders not yet invoiced</span></div>
              <div className="table-wrap">
                <table className="data">
                  <tbody>
                    {CUST.filter((c: any) => custAdvances(c.id) > 0).map((c: any) => <tr key={c.id}><td>{c.name}</td><td className="num">{inr(custAdvances(c.id))}</td></tr>)}
                    {!CUST.some((c: any) => custAdvances(c.id) > 0) && <tr><td className="empty">No advances held.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <section className="card">
            <div className="card-head"><h2>By customer</h2><span className="small muted">Select a row for the customer overview</span></div>
            <AgeTable rows={arRows()} nameHead="Customer" extraHead="Last follow-up" onRow={(r) => openModal(<Cust360 cid={r.key} />)}
              extraCell={(r) => {
                const la = lastAct(r.key, (a: any) => a.type === "Collection call" || /reminder/i.test(a.subject));
                return <td className="small nowrap">{la ? <>{ds(la.date)}<div className="cell-sub">{la.outcome || la.type}</div></> : <span className="muted">None</span>}</td>;
              }} />
          </section>
        </>
      )}
      {tab === "open" && (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th className="num">Balance</th><th>Promise to pay</th><th>Last reminder</th><th></th></tr></thead>
              <tbody>
                {open.slice().sort((a: any, b: any) => b.od - a.od).map((x: any) => {
                  const v = x.v, p = promiseOf(v);
                  const rem = ACTS.filter((a: any) => a.ref === v.id && /reminder/i.test(a.subject)).sort((a: any, b: any) => b.date - a.date)[0];
                  return (
                    <tr key={v.id}>
                      <td className="nowrap"><button className="linkish mono cell-title" onClick={() => openModal(<InvoiceModal id={v.id} />)}>{v.id}</button><div className="cell-sub">{ds(v.date)} · {v.so}</div></td>
                      <td style={{ minWidth: 150 }}><button className="linkish" onClick={() => openModal(<Cust360 cid={v.cust} />)}>{custBy(v.cust).name}</button><div className="cell-sub">{(acctContact(v.cust) || { name: "—" }).name}</div></td>
                      <td className="nowrap">{ds(v.due)}<div>{x.od > 0 ? <Pill t={`${x.od}d overdue`} c={x.od > 60 ? "bad" : "warn"} /> : <Pill t={`Due in ${-x.od}d`} />}</div></td>
                      <td className="num">{inr(x.bal)}<div className="cell-sub">of {inr(v.total)}</div></td>
                      <td className="small nowrap">{p ? <>{inr(p.amt)} by {ds(p.date)}<div>{p.broken ? <Pill t="Broken" c="bad" /> : <Pill t="Open" c="info" />}</div></> : <span className="muted">—</span>}</td>
                      <td className="small">{rem ? <>{ds(rem.date)}<div className="cell-sub">{rem.subject.replace("Payment reminder: ", "")}</div></> : <span className="muted">None</span>}</td>
                      <td>
                        <div className="act-row">
                          {canEdit("invoices") && <button className="btn sm primary" onClick={() => openModal(<PayModal id={v.id} />)}>Payment</button>}
                          {(ed || canEdit("crm")) && <button className="btn sm" onClick={() => openAct({ cust: v.cust, ref: v.id, type: "Collection call" })}>Follow up</button>}
                          {ed && x.od > 0 && <button className="btn sm ghost" onClick={() => remind(v.cust)}>Reminder</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!open.length && <tr><td colSpan={7} className="empty">Nothing outstanding.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "receipts" && (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Date</th><th>Customer</th><th>Against</th><th>Mode · reference</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {receipts().map((x, i) => (
                  <tr key={i}>
                    <td className="nowrap">{ds(x.date)}</td><td>{custBy(x.cust).name}</td>
                    <td className="small"><span className="mono">{x.doc}</span><div className="cell-sub">{x.kind}</div></td>
                    <td className="small">{x.mode} · <span className="mono">{x.ref}</span></td><td className="num">{inr(x.amt)}</td>
                  </tr>
                ))}
                {!receipts().length && <tr><td colSpan={5} className="empty">No receipts yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "ledger" && <ArLedger cid={UI.arCust} />}
    </>
  );
}

function arLedger(cid: string) {
  const e: any[] = [];
  ORDERS.filter((o: any) => o.cust === cid).forEach((o: any) => (o.payments || []).forEach((p: any) => e.push({ date: p.date, doc: o.id, txt: `Advance received · ${p.mode} ${p.ref}`, dr: 0, cr: p.amt })));
  INVOICES.filter((v: any) => v.cust === cid).forEach((v: any) => {
    e.push({ date: v.date, doc: v.id, txt: `Tax invoice · ${v.so}${v.advAdj ? ` · advance adjusted ${inr(v.advAdj)}` : ""}`, dr: v.total, cr: 0 });
    v.pays.forEach((p: any) => e.push({ date: p.date, doc: v.id, txt: `Payment · ${p.mode} ${p.ref}`, dr: 0, cr: p.amt }));
  });
  e.sort((a, b) => a.date - b.date || b.dr - a.dr);
  let bal = 0;
  e.forEach((x) => { bal += x.dr - x.cr; x.bal = bal; });
  return e;
}

function ArLedger({ cid }: { cid: string }) {
  const e = arLedger(cid);
  const bal = e.length ? e[e.length - 1].bal : 0;
  const c = custBy(cid);
  return (
    <>
      <div className="toolbar">
        <label htmlFor="ar-cust" className="small muted" style={{ alignSelf: "center" }}>Customer</label>
        <select className="input" id="ar-cust" value={cid} onChange={(x) => setUI({ arCust: x.target.value })} style={{ width: "auto", minWidth: 0, maxWidth: 280 }}><CustOptions /></select>
      </div>
      <section className="card">
        <div className="card-head">
          <div><h2>Statement of account · {c.name}</h2><div className="small muted">{creditTxt(c)}{c.gstin ? " · GSTIN " + c.gstin : ""}</div></div>
          <span className="cell-title">{bal >= 0 ? "Balance due " + inr(bal) : "Credit " + inr(-bal)}</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Date</th><th>Document</th><th>Particulars</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {e.map((x, i) => (
                <tr key={i}>
                  <td className="nowrap">{ds(x.date)}</td><td className="mono small nowrap">{x.doc}</td><td className="small">{x.txt}</td>
                  <td className="num">{x.dr ? inr(x.dr) : ""}</td><td className="num">{x.cr ? inr(x.cr) : ""}</td>
                  <td className="num">{x.bal >= 0 ? inr(x.bal) + " Dr" : inr(-x.bal) + " Cr"}</td>
                </tr>
              ))}
              {!e.length && <tr><td colSpan={6} className="empty">No transactions.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function remind(cid: string) {
  if (!allow("receivables")) return;
  const items = arOpen().filter((x: any) => x.v.cust === cid && x.od > 0);
  if (!items.length) return toast("Nothing overdue for this customer.", true);
  openModal(<RemindModal cid={cid} />);
}

function RemindModal({ cid }: { cid: string }) {
  const c = custBy(cid);
  const items = arOpen().filter((x: any) => x.v.cust === cid && x.od > 0).sort((a: any, b: any) => b.od - a.od);
  const lvl = dunLevel(items[0].od);
  const ct = acctContact(cid);
  const sum = items.reduce((s: number, x: any) => s + x.bal, 0);
  const pl = items.length > 1;
  const opening =
    lvl === "Friendly reminder" ? `This is a friendly reminder that the following invoice${pl ? "s are" : " is"} now past due:`
      : lvl === "Second reminder" ? `We have not yet received payment for the following overdue invoice${pl ? "s" : ""}, despite our earlier reminder:`
        : `Despite earlier reminders, the following invoice${pl ? "s remain" : " remains"} unpaid. Please arrange payment within 7 days to avoid a hold on further dispatches and service visits:`;
  const initial = `Subject: ${lvl}: payment overdue, ${COMPANY.name}\n\nDear ${ct ? ct.name : "Sir/Madam"},\n\n${opening}\n\n${items.map((x: any) => `  ${x.v.id} dated ${ds(x.v.date)}, due ${ds(x.v.due)}: ${inr(x.bal)} (${x.od} days overdue)`).join("\n")}\n\nTotal overdue: ${inr(sum)}\n\nPlease remit to our account and share the UTR with accounts. If payment has already been made, kindly ignore this note and send us the details.\n\nRegards,\nAccounts, ${COMPANY.name}`;
  const [txt, setTxt] = useState(initial);
  const copy = () => {
    try {
      navigator.clipboard.writeText(txt).then(() => toast("Reminder copied"), () => toast("Select all and copy the text"));
    } catch {
      toast("Select all and copy the text");
    }
  };
  const sent = () => {
    if (!allow("receivables")) return;
    items.forEach((x: any) => ACTS.push(mkAct({ type: "Email", cust: cid, contact: ct ? ct.id : "", ref: x.v.id, subject: `Payment reminder: ${lvl.toLowerCase()}`, notes: `${inr(x.bal)} overdue ${x.od} days.`, date: new Date(TODAY), by: SESSION.user })));
    closeModal(); bump(); toast(`${lvl} logged for ${c.name} (${items.length} invoice${pl ? "s" : ""})`);
  };
  return (
    <Modal wide title={`${lvl} · ${c.name}`}
      foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn" onClick={copy}>Copy text</button><button className="btn primary" onClick={sent}>Mark as sent</button></>}>
      <p className="small muted">To {ct ? `${ct.name} <${ct.email}>` : "the customer"} · level set by the oldest overdue invoice ({items[0].od} days)</p>
      <label htmlFor="rm-text" style={{ position: "absolute", left: -9999 }}>Reminder text</label>
      <textarea className="input mono" id="rm-text" rows={16} style={{ fontSize: 12.5 }} value={txt} onChange={(e) => setTxt(e.target.value)} />
    </Modal>
  );
}

/* ================= Payables ================= */
function vpayments() {
  const r: any[] = [];
  BILLS.forEach((b: any) => b.pays.forEach((p: any) => r.push({ date: p.date, ven: b.vendor, doc: b.id, vinv: b.vinv, amt: p.amt, mode: p.mode, ref: p.ref })));
  return r.sort((a, b) => b.date - a.date);
}

export function PayablesPage() {
  useErp();
  const tab = UI.apTab;
  const open = apOpen();
  const tot = [0, 0, 0, 0, 0];
  open.forEach((x: any) => (tot[bucketOf(x.od)] += x.bal));
  const all = tot.reduce((s, x) => s + x, 0);
  const d7 = open.filter((x: any) => x.od > -7 && x.od <= 0).reduce((s: number, x: any) => s + x.bal, 0);
  const od = all - tot[0];
  const msmeRisk = open.filter((x: any) => x.msme && x.od > -7);
  const hold = BILLS.filter((b: any) => b.status === PEND);
  const month = vpayments().filter((r) => r.date.getMonth() === TODAY.getMonth() && r.date.getFullYear() === TODAY.getFullYear()).reduce((s, r) => s + r.amt, 0);
  const ed = canEdit("payables");
  return (
    <>
      <PageHead route="payables" title="Payables" desc="What we owe vendors, when it falls due, and the payment run. Due dates follow vendor terms; MSME vendors are held to 45 days." />
      <div className="kpis">
        <div className="kpi"><span className="k-label">Total payable</span><span className="k-value">{inrShort(all)}</span><span className="k-foot">{open.length} approved bills · {hold.length} on hold</span></div>
        <div className={`kpi ${d7 ? "warn" : ""}`}><span className="k-label">Due in 7 days</span><span className="k-value">{inrShort(d7)}</span><span className="k-foot">{inrShort(od)} already overdue</span></div>
        <div className={`kpi ${msmeRisk.length ? "alert" : ""}`}><span className="k-label">MSME bills at risk</span><span className="k-value">{msmeRisk.length}</span><span className="k-foot">MSME bills due within 7 days or overdue</span></div>
        <div className="kpi"><span className="k-label">Paid this month</span><span className="k-value">{inrShort(month)}</span><span className="k-foot">{inrShort(DEBITS.reduce((s: number, d: any) => s + d.total, 0))} recovered by debit notes</span></div>
      </div>
      <div className="toolbar">
        <Seg wrap value={tab} onChange={(v) => setUI({ apTab: v })} options={[["due", `Due for payment (${open.length})`], ["ageing", "Ageing by vendor"], ["payments", "Payments"], ["ledger", "Vendor ledger"]]} />
      </div>
      {tab === "due" && <DueTab open={open} msmeRisk={msmeRisk} hold={hold} ed={ed} />}
      {tab === "ageing" && (
        <>
          <div className="grid-2">
            <section className="card"><div className="card-head"><h2>Ageing summary</h2><span className="small muted">Days past the due date</span></div><div className="card-body"><AgeBars tot={tot} /></div></section>
            <section className="card">
              <div className="card-head"><h2>Debit notes</h2><button className="btn ghost sm" onClick={() => go("bills")}>Vendor bills</button></div>
              <div className="table-wrap">
                <table className="data">
                  <tbody>
                    {DEBITS.map((d: any) => <tr key={d.id}><td className="mono small">{d.id}<div className="cell-sub">{ds(d.date)}</div></td><td>{venBy(d.vendor).name}</td><td className="num">{inr(d.total)}</td></tr>)}
                    {!DEBITS.length && <tr><td className="empty">No debit notes.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <section className="card">
            <div className="card-head"><h2>By vendor</h2><span className="small muted">Select a row for the vendor ledger</span></div>
            <AgeTable nameHead="Vendor" onRow={(r) => setUI({ apTab: "ledger", apVen: r.key })}
              rows={(() => {
                const by: Record<string, number[]> = {};
                open.forEach((x: any) => { (by[x.b.vendor] = by[x.b.vendor] || [0, 0, 0, 0, 0])[bucketOf(x.od)] += x.bal; });
                return Object.entries(by).map(([vid, b]) => {
                  const v = venBy(vid);
                  return { key: vid, b, name: v.name, sub: `${v.msme ? "MSME · " + Math.min(v.terms || 30, 45) + " days" : (v.terms || 30) + " days"} · ${v.city}` };
                });
              })()} />
          </section>
        </>
      )}
      {tab === "payments" && (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Date</th><th>Vendor</th><th>Bill</th><th>Mode · reference</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {vpayments().map((x, i) => (
                  <tr key={i}>
                    <td className="nowrap">{ds(x.date)}</td><td>{venBy(x.ven).name}</td>
                    <td className="small"><span className="mono">{x.doc}</span><div className="cell-sub">{x.vinv}</div></td>
                    <td className="small">{x.mode} · <span className="mono">{x.ref}</span></td><td className="num">{inr(x.amt)}</td>
                  </tr>
                ))}
                {!vpayments().length && <tr><td colSpan={5} className="empty">No payments yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "ledger" && <VenLedger vid={UI.apVen} />}
    </>
  );
}

function DueTab({ open, msmeRisk, hold, ed }: { open: any[]; msmeRisk: any[]; hold: any[]; ed: boolean }) {
  const sel = [...UI.apSel].filter((id: string) => open.some((x) => x.b.id === id));
  if (sel.length !== UI.apSel.size) UI.apSel = new Set(sel);
  const selAmt = open.filter((x) => UI.apSel.has(x.b.id)).reduce((s, x) => s + x.bal, 0);
  const toggle = (id: string, on: boolean) => { const s = new Set(UI.apSel); if (on) s.add(id); else s.delete(id); setUI({ apSel: s }); };
  return (
    <>
      {msmeRisk.length > 0 && (
        <div className="banner warn">
          <span><b>{msmeRisk.length} MSME bill{msmeRisk.length > 1 ? "s" : ""}</b> must be paid within 45 days of acceptance. Late payment carries interest under the MSMED Act and the expense is disallowed under section 43B(h) until paid.</span>
        </div>
      )}
      <div className="toolbar">
        {ed && (
          <>
            <button className="btn primary" disabled={!sel.length} onClick={() => { if (!UI.apSel.size) return toast("Select bills to pay.", true); if (allow("payables")) openModal(<PayRunModal />); }}>
              Pay selected ({sel.length} · {inr(selAmt)})
            </button>
            <button className="btn" onClick={() => setUI({ apSel: new Set(apOpen().filter((x: any) => x.od > -7).map((x: any) => x.b.id)) })}>Select due in 7 days</button>
            <button className="btn ghost" onClick={() => setUI({ apSel: new Set() })}>Clear</button>
          </>
        )}
      </div>
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th style={{ width: 40 }}><span style={{ position: "absolute", left: -9999 }}>Select</span></th><th>Bill</th><th>Vendor</th><th>Due</th><th className="num">Bill total</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {open.slice().sort((a, b) => a.due - b.due).map((x) => {
                const b = x.b, v = venBy(b.vendor);
                return (
                  <tr key={b.id}>
                    <td>{ed && <input type="checkbox" checked={UI.apSel.has(b.id)} onChange={(e) => toggle(b.id, e.target.checked)} aria-label={`Select ${b.id}`} style={{ width: 16, height: 16, accentColor: "var(--primary)" }} />}</td>
                    <td className="nowrap"><button className="linkish mono cell-title" onClick={() => openModal(<BillDetail id={b.id} />)}>{b.id}</button><div className="cell-sub">{b.vinv} · {ds(b.vdate)}</div></td>
                    <td style={{ minWidth: 150 }}>{v.name} {x.msme && <Pill t="MSME" c="info" />}<div className="cell-sub">{v.msme ? Math.min(v.terms || 30, 45) + " days · MSME cap 45" : (v.terms || 30) + " days"}</div></td>
                    <td className="nowrap">{ds(x.due)}<div>{x.od > 0 ? <Pill t={`${x.od}d overdue`} c="bad" /> : x.od > -7 ? <Pill t={x.od === 0 ? "Due today" : `Due in ${-x.od}d`} c="warn" /> : <Pill t={`In ${-x.od}d`} />}</div></td>
                    <td className="num">{inr(billPayable(b))}</td><td className="num">{billPaid(b) ? inr(billPaid(b)) : "—"}</td><td className="num cell-title">{inr(x.bal)}</td>
                  </tr>
                );
              })}
              {!open.length && <tr><td colSpan={7} className="empty">No approved bills to pay.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {hold.length > 0 && (
        <p className="small muted">
          {hold.length} bill{hold.length > 1 ? "s are" : " is"} on hold for a 3-way mismatch and cannot be paid until approved in{" "}
          <a href="/bills" onClick={(e) => { e.preventDefault(); go("bills"); }}>Vendor bills</a>.
        </p>
      )}
    </>
  );
}

function VenLedger({ vid }: { vid: string }) {
  const v = venBy(vid);
  const e: any[] = [];
  BILLS.filter((b: any) => b.vendor === vid && b.status !== "Rejected").forEach((b: any) => {
    e.push({ date: b.vdate, doc: b.id, txt: `Bill ${b.vinv}${b.status === PEND ? " · on hold" : ""}`, dr: 0, cr: billCalc(b).total });
    b.pays.forEach((p: any) => e.push({ date: p.date, doc: b.id, txt: `Payment · ${p.mode} ${p.ref}`, dr: p.amt, cr: 0 }));
  });
  DEBITS.filter((d: any) => d.vendor === vid).forEach((d: any) => e.push({ date: d.date, doc: d.id, txt: `Debit note against ${d.ref}`, dr: d.total, cr: 0 }));
  e.sort((a, b) => a.date - b.date || b.cr - a.cr);
  let bal = 0;
  e.forEach((x) => { bal += x.cr - x.dr; x.bal = bal; });
  return (
    <>
      <div className="toolbar">
        <label htmlFor="ap-ven" className="small muted" style={{ alignSelf: "center" }}>Vendor</label>
        <select className="input" id="ap-ven" value={vid} onChange={(x) => setUI({ apVen: x.target.value })} style={{ width: "auto", minWidth: 0, maxWidth: 280 }}><VenOptions /></select>
      </div>
      <section className="card">
        <div className="card-head">
          <div><h2>Vendor ledger · {v.name}</h2><div className="small muted">{v.msme ? `MSME ${v.udyam} · ${Math.min(v.terms || 30, 45)} days` : (v.terms || 30) + " days"} · GSTIN {v.gstin || "—"}</div></div>
          <span className="cell-title">{bal >= 0 ? "We owe " + inr(bal) : "Advance " + inr(-bal)}</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Date</th><th>Document</th><th>Particulars</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {e.map((x, i) => (
                <tr key={i}>
                  <td className="nowrap">{ds(x.date)}</td><td className="mono small nowrap">{x.doc}</td><td className="small">{x.txt}</td>
                  <td className="num">{x.dr ? inr(x.dr) : ""}</td><td className="num">{x.cr ? inr(x.cr) : ""}</td>
                  <td className="num">{x.bal >= 0 ? inr(x.bal) + " Cr" : inr(-x.bal) + " Dr"}</td>
                </tr>
              ))}
              {!e.length && <tr><td colSpan={6} className="empty">No transactions.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function PayRunModal() {
  const rows = apOpen().filter((x: any) => UI.apSel.has(x.b.id)).sort((a: any, b: any) => a.due - b.due);
  const [amts, setAmts] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((x: any) => [x.b.id, String(x.bal)])));
  const [date, setDate] = useState(isoLocal(TODAY));
  const [mode, setMode] = useState("NEFT");
  const [ref, setRef] = useState("");
  const [e, setE] = useState<Record<string, string>>({});
  const total = Object.values(amts).reduce((s, v) => s + Math.max(0, +v || 0), 0);
  const save = () => {
    if (!allow("payables")) return;
    const r = ref.trim();
    if (!r) return setE({ ref: "Enter the bank batch or UTR reference." });
    for (const x of rows) {
      const amt = +amts[x.b.id] || 0;
      if (amt < 0 || amt > billBal(x.b) + 0.5) return setE({ err: `${x.b.id}: amount must be between 0 and ${inr(billBal(x.b))}.` });
    }
    const d = fromIso(date);
    let n = 0, sum = 0;
    rows.forEach((x: any) => {
      const amt = numOf(amts[x.b.id]);
      if (!amt) return;
      x.b.pays.push({ date: d, amt, mode, ref: r });
      logD(x.b, "Payment made", `${inr(amt)} by ${mode} (${r}), payment run`, "ok");
      n++; sum += amt;
    });
    if (!n) return setE({ err: "Enter an amount for at least one bill." });
    UI.apSel = new Set();
    closeModal(); bump(); toast(`Payment run ${r}: ${n} bill${n > 1 ? "s" : ""}, ${inr(sum)}`);
  };
  return (
    <Modal wide title={`Payment run · ${rows.length} bill${rows.length > 1 ? "s" : ""}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Record payments</button></>}>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Bill</th><th>Vendor</th><th className="num">Balance</th><th className="num">Pay now</th></tr></thead>
          <tbody>
            {rows.map((x: any) => (
              <tr key={x.b.id}>
                <td className="mono small nowrap">{x.b.id}<div className="cell-sub">{x.b.vinv}</div></td>
                <td>{venBy(x.b.vendor).name}{x.msme && <> <Pill t="MSME" c="info" /></>}</td>
                <td className="num">{inr(x.bal)}</td>
                <td className="num"><input className="input num" type="number" min={0} step="any" value={amts[x.b.id]} onChange={(ev) => setAmts({ ...amts, [x.b.id]: ev.target.value })} style={{ width: 130 }} aria-label={`Amount for ${x.b.id}`} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={3}>Total of this run</td><td className="num">{inr(total)}</td></tr></tfoot>
        </table>
      </div>
      <div className="form-grid">
        <Field id="pr-date" label="Value date"><input className="input" id="pr-date" type="date" value={date} onChange={(x) => setDate(x.target.value)} /></Field>
        <Field id="pr-mode" label="Mode"><select className="input" id="pr-mode" value={mode} onChange={(x) => setMode(x.target.value)}><option>NEFT</option><option>RTGS</option><option>Cheque</option></select></Field>
        <Field id="pr-ref" label="Bank batch / UTR reference *" err={e.ref}>
          <input className={`input ${e.ref ? "invalid" : ""}`} id="pr-ref" value={ref} onChange={(x) => setRef(x.target.value)} placeholder="One reference for the whole run" />
        </Field>
      </div>
      <ErrLine msg={e.err} />
    </Modal>
  );
}
