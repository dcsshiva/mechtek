import { useState } from "react";
import { COMPANY, GST_RATE, INVOICES, custBy, fgBy, invBal, invPaid, invStatus, stateCode } from "@/erp/engine";
import { TODAY, daysFrom, ds, fromIso, inWords, inr, inrShort, isoLocal, num } from "@/erp/format";
import { canEdit } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { Field, Modal, PageHead, Pill, closeModal, openModal, toast } from "../ui";

export function InvoicesPage() {
  useErp();
  const out = INVOICES.reduce((s: number, v: any) => s + invBal(v), 0);
  const od = INVOICES.filter((v: any) => invBal(v) > 0 && daysFrom(v.due) < 0);
  const month = INVOICES.filter((v: any) => v.date.getMonth() === TODAY.getMonth() && v.date.getFullYear() === TODAY.getFullYear()).reduce((s: number, v: any) => s + v.total, 0);
  const gst = INVOICES.reduce((s: number, v: any) => s + v.cgst + v.sgst + v.igst, 0);
  return (
    <>
      <PageHead route="invoices" title="Invoices" desc="GST tax invoices raised at dispatch, with advances adjusted and payments received. Open an invoice to view it or record a payment." />
      <div className="kpis">
        <div className="kpi"><span className="k-label">Invoiced this month</span><span className="k-value">{inrShort(month)}</span><span className="k-foot">incl. GST</span></div>
        <div className="kpi"><span className="k-label">GST charged</span><span className="k-value">{inrShort(gst)}</span><span className="k-foot">CGST + SGST + IGST, all invoices</span></div>
        <div className={`kpi ${out > 0 ? "warn" : ""}`}><span className="k-label">Outstanding</span><span className="k-value">{inrShort(out)}</span><span className="k-foot">{INVOICES.filter((v: any) => invBal(v) > 0).length} invoices open</span></div>
        <div className={`kpi ${od.length ? "alert" : ""}`}><span className="k-label">Overdue</span><span className="k-value">{od.length}</span><span className="k-foot">past 30-day terms</span></div>
      </div>
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Order · DC</th><th>Supply</th><th className="num">Taxable</th><th className="num">GST</th><th className="num">Total</th><th className="num">Balance</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {INVOICES.slice().reverse().map((v: any) => {
                const st = invStatus(v);
                const c = custBy(v.cust);
                return (
                  <tr key={v.id} className="clickable" onClick={() => openModal(<InvoiceModal id={v.id} />)}>
                    <td className="nowrap"><div className="cell-title mono">{v.id}</div><div className="cell-sub">{ds(v.date)}</div></td>
                    <td>{c.name}<div className="cell-sub mono">{c.gstin || c.country}</div></td>
                    <td className="nowrap mono">{v.so}<div className="cell-sub">{v.dc}</div></td>
                    <td className="small nowrap">{v.sup === "intra" ? "CGST+SGST" : v.sup === "inter" ? "IGST" : "Export (LUT)"}</td>
                    <td className="num">{inr(v.taxable)}</td>
                    <td className="num">{inr(v.cgst + v.sgst + v.igst)}</td>
                    <td className="num">{inr(v.total)}</td>
                    <td className="num">{inr(invBal(v))}</td>
                    <td><Pill t={st.t} c={st.c} /></td>
                    <td className="nowrap" onClick={(e) => e.stopPropagation()}>
                      <button className="btn sm" onClick={() => openModal(<InvoiceModal id={v.id} />)}>View</button>
                      {invBal(v) > 0 && canEdit("invoices") && (
                        <> <button className="btn sm primary" title="Record payment" onClick={() => openModal(<PayModal id={v.id} />)}>Payment</button></>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!INVOICES.length && <tr><td colSpan={10} className="empty">No invoices yet. Invoices are created when an order is dispatched.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function InvoiceDoc({ v }: { v: any }) {
  const c = custBy(v.cust);
  const st = invStatus(v);
  const supLabel = v.sup === "export" ? "Export: supply under LUT without payment of IGST" : v.sup === "intra" ? "Intra-state supply (CGST + SGST)" : "Inter-state supply (IGST)";
  return (
    <div className="inv-doc">
      <div className="inv-head">
        <div><div className="inv-title">TAX INVOICE</div><div className="small muted">Original for recipient · sample document</div></div>
        <div style={{ textAlign: "right" }}><div className="mono cell-title">{v.id}</div><div className="small">Date {ds(v.date)}</div><Pill t={st.t} c={st.c} /></div>
      </div>
      <div className="inv-parties">
        <div>
          <div className="inv-lbl">Supplier</div><b>{COMPANY.name}</b>
          <div className="small">{COMPANY.addr}</div><div className="small">State: {COMPANY.state} ({COMPANY.code})</div>
          <div className="small mono">GSTIN {COMPANY.gstin}</div>
        </div>
        <div>
          <div className="inv-lbl">Bill to / ship to</div><b>{c.name}</b>
          <div className="small">{c.addr || ""}{c.addr ? ", " : ""}{c.city}, {c.country}</div>
          {c.country === "India" ? (
            <>
              <div className="small">State: {c.state || "—"} ({stateCode(c.state) || "—"})</div>
              <div className="small mono">GSTIN {c.gstin || "—"}</div>
            </>
          ) : (
            <div className="small">Export customer</div>
          )}
        </div>
        <div>
          <div className="inv-lbl">Order and transport</div>
          <div className="small">Sales order <span className="mono">{v.so}</span></div>
          <div className="small">Customer PO {v.custPO || "—"}</div>
          <div className="small">Delivery challan <span className="mono">{v.dc}</span></div>
          <div className="small">Place of supply: {v.sup === "export" ? "Outside India (96)" : `${c.state} (${stateCode(c.state)})`}</div>
          <div className="small">{v.transporter} · {v.vehicle} · {v.lr || ""}</div>
          {v.ewb && <div className="small">E-way bill {v.ewb}</div>}
          {v.sb && <div className="small">Shipping bill {v.sb}</div>}
        </div>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>#</th><th>Description</th><th>HSN</th><th className="num">Qty</th><th className="num">List rate</th><th className="num">Disc.</th><th className="num">Rate</th><th className="num">Taxable value</th></tr></thead>
          <tbody>
            {v.lines.map((l: any, i: number) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{l.kid ? "↳ " : ""}{fgBy[l.item].name}<div className="cell-sub">{fgBy[l.item].family}{l.incl ? " · included in main item price" : ""}</div></td>
                <td className="mono">{l.hsn}</td>
                <td className="num">{l.qty} nos</td>
                <td className="num">{inr(l.list)}</td>
                <td className="num">{l.disc}%</td>
                <td className="num">{inr(l.rate)}</td>
                <td className="num">{inr(l.taxable)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={7}>Taxable value</td><td className="num">{inr(v.taxable)}</td></tr>
            {v.sup === "intra" ? (
              <>
                <tr><td colSpan={7}>CGST @ {GST_RATE / 2}%</td><td className="num">{inr(v.cgst)}</td></tr>
                <tr><td colSpan={7}>SGST @ {GST_RATE / 2}%</td><td className="num">{inr(v.sgst)}</td></tr>
              </>
            ) : v.sup === "inter" ? (
              <tr><td colSpan={7}>IGST @ {GST_RATE}%</td><td className="num">{inr(v.igst)}</td></tr>
            ) : (
              <tr><td colSpan={7}>IGST (zero-rated export under LUT)</td><td className="num">{inr(0)}</td></tr>
            )}
            {v.roundOff ? <tr><td colSpan={7}>Round off</td><td className="num">{v.roundOff > 0 ? "" : "− "}{inr(Math.abs(v.roundOff))}</td></tr> : null}
            <tr><td colSpan={7}><b>Invoice total</b></td><td className="num"><b>{inr(v.total)}</b></td></tr>
          </tfoot>
        </table>
      </div>
      <p className="small"><b>Amount in words:</b> Rupees {inWords(v.total)} only · {supLabel}</p>
      <div className="inv-pay">
        <div><span className="muted small">Advance adjusted</span><b>{inr(v.advAdj)}</b></div>
        <div><span className="muted small">Payments received</span><b>{inr(invPaid(v))}</b></div>
        <div><span className="muted small">Balance due by {ds(v.due)}</span><b style={{ color: invBal(v) > 0 ? "var(--bad)" : "var(--ok)" }}>{inr(invBal(v))}</b></div>
      </div>
      {v.pays.length > 0 && (
        <div className="small muted">{v.pays.map((p: any) => `${ds(p.date)}: ${inr(p.amt)} by ${p.mode} (${p.ref})`).join(" · ")}</div>
      )}
      <div className="inv-sign">
        <span className="small muted">Payment terms: {Math.max(0, Math.round((v.due - v.date) / 864e5))} days from invoice. Subject to Bengaluru jurisdiction.</span>
        <span className="small">for <b>{COMPANY.name}</b><br /><br />Authorised signatory</span>
      </div>
    </div>
  );
}

export function InvoiceModal({ id }: { id: string }) {
  const v = INVOICES.find((x: any) => x.id === id);
  return (
    <Modal
      wide
      title={`Tax invoice ${v.id}`}
      foot={
        <>
          <button className="btn" onClick={closeModal}>Close</button>
          {invBal(v) > 0 && canEdit("invoices") && <button className="btn primary" onClick={() => openModal(<PayModal id={v.id} />)}>Record payment</button>}
        </>
      }
    >
      <InvoiceDoc v={v} />
    </Modal>
  );
}

export function PayModal({ id }: { id: string }) {
  const v = INVOICES.find((x: any) => x.id === id);
  const b = invBal(v);
  const [amt, setAmt] = useState(String(b));
  const [date, setDate] = useState(isoLocal(TODAY));
  const [mode, setMode] = useState("NEFT");
  const [ref, setRef] = useState("");
  const [e, setE] = useState<Record<string, string>>({});
  const save = () => {
    const a = num(amt);
    const errs: Record<string, string> = {};
    if (!(a > 0)) errs.amt = "Enter the amount received.";
    else if (a > b + 0.5) errs.amt = `More than the balance of ${inr(b)}.`;
    if (!ref.trim()) errs.ref = "Enter the UTR or cheque number.";
    setE(errs);
    if (Object.keys(errs).length) return;
    v.pays.push({ date: fromIso(date), amt: a, mode, ref: ref.trim() });
    closeModal();
    bump();
    toast(`${inr(a)} received against ${v.id} · ${invStatus(v).t.toLowerCase()}`);
  };
  return (
    <Modal title={`Record payment · ${v.id}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Save payment</button></>}>
      <p>{custBy(v.cust).name} · balance due <b>{inr(b)}</b></p>
      <div className="form-grid">
        <Field id="py-amt" label="Amount received (₹) *" err={e.amt}>
          <input className={`input num ${e.amt ? "invalid" : ""}`} id="py-amt" type="number" min={1} step="any" max={b} value={amt} onChange={(x) => setAmt(x.target.value)} />
        </Field>
        <Field id="py-date" label="Date"><input className="input" id="py-date" type="date" value={date} onChange={(x) => setDate(x.target.value)} /></Field>
        <Field id="py-mode" label="Mode">
          <select className="input" id="py-mode" value={mode} onChange={(x) => setMode(x.target.value)}>
            <option>NEFT</option><option>RTGS</option><option>Cheque</option><option>SWIFT (export)</option>
          </select>
        </Field>
        <Field id="py-ref" label="UTR / cheque no. *" err={e.ref}>
          <input className={`input ${e.ref ? "invalid" : ""}`} id="py-ref" value={ref} onChange={(x) => setRef(x.target.value)} />
        </Field>
      </div>
      <p className="small muted">A part payment is fine; the invoice stays open for the balance.</p>
    </Modal>
  );
}
