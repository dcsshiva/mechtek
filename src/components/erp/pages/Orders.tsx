import { useMemo, useState } from "react";
import {
  ORDERS, WOS, INVOICES, INSTALLED, DCS, SEQ, GSTIN_RE,
  custBy, fgBy, orderStatus, orderValue, supplyType, taxCalc, woOf, woStages, mk, isKid, kindLabel, hsnOf,
  invBal, readyLines, lineRate, advLeft, makeInvoice, stateCode,
} from "@/erp/engine";
import { TODAY, ds, inr, num } from "@/erp/format";
import { canEdit } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { go } from "@/erp/nav";
import { DL, ErrLine, Field, Modal, PageHead, Pill, Stages, closeModal, openModal, toast } from "../ui";
import { OrdersTable } from "./common";
import { InvoiceModal } from "./Invoices";
import { CustModal } from "./Customers";
import { QuoteForm } from "./Quotes";

export function OrdersPage() {
  useErp();
  const list = ORDERS.slice().sort((a: any, b: any) => a.dispatched - b.dispatched || a.due - b.due);
  return (
    <>
      <PageHead
        route="orders"
        title="Sales orders"
        desc="Select an order to see its lines, work orders and progress."
        actions={[<button key="n" className="btn primary" onClick={() => openModal(<QuoteForm />)}>New quotation</button>]}
      />
      <section className="card"><div className="table-wrap"><OrdersTable list={list} /></div></section>
    </>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const o = ORDERS.find((x: any) => x.id === id);
  const c = custBy(o.cust);
  const st = orderStatus(o);
  const sup = supplyType(c);
  const ws = WOS.filter((w: any) => w.so === o.id);
  const invs = INVOICES.filter((v: any) => v.so === o.id);
  const t = taxCalc(orderValue(o), sup);
  const needWo = o.lines.some((l: any) => mk(l) && !woOf(o, l));
  const allOut = o.lines.every((l: any) => (l.disp || 0) >= l.qty);
  const steps: [string, boolean][] = [
    ["Customer PO received", true],
    ["Advance received", !!o.advance],
    ["Production released", !needWo],
    ["All items built", o.lines.filter(mk).every((l: any) => { const w = woOf(o, l); return w && w.stage === woStages(w).length - 1; })],
    ["Dispatched and invoiced", allOut],
    ["Fully paid", invs.length > 0 && allOut && invs.every((v: any) => invBal(v) <= 0.5)],
  ];
  if (o.lines.some((l: any) => fgBy[l.item].kind === "machine")) {
    const ins = INSTALLED.filter((i: any) => i.so === o.id);
    steps.push(["Machines installed", ins.length > 0 && allOut && ins.every((i: any) => !i.pending)]);
  }

  const releaseSo = () => {
    if (!o.advance) return toast(`${o.id}: record the advance before releasing production.`, true);
    let n = 0;
    o.lines.forEach((l: any) => {
      if (mk(l) && !woOf(o, l)) {
        WOS.push({ id: "WO-" + SEQ.wo++, so: o.id, item: l.item, qty: l.qty, stage: 0, issued: false, ln: o.lines.indexOf(l) });
        n++;
      }
    });
    bump();
    toast(`${n} work order${n === 1 ? "" : "s"} released for ${o.id}`);
  };

  return (
    <Modal
      wide
      title={`Sales order ${o.id}`}
      foot={
        <>
          <button className="btn" onClick={closeModal}>Close</button>
          {!o.dispatched && canEdit("orders") && (
            <button className="btn" onClick={() => openModal(<AdvanceModal id={o.id} />)}>
              {o.advance ? "Record more advance" : "Record advance received"}
            </button>
          )}
          {o.advance && needWo && canEdit("workorders") && <button className="btn primary" onClick={releaseSo}>Release production</button>}
          {readyLines(o).length > 0 && canEdit("dispatch") && (
            <button className="btn primary" onClick={() => openModal(<DispatchModal id={o.id} />)}>Dispatch ready items</button>
          )}
        </>
      }
    >
      <div className="flowline" aria-label="Order progress">
        {steps.map((x, i) => (
          <span key={i} style={{ display: "contents" }}>
            {i > 0 && <span className="arr">→</span>}
            <span className={`box ${x[1] ? "" : "ap"}`} style={x[1] ? { borderColor: "var(--ok)", color: "var(--ok)" } : undefined}>
              {x[1] ? "✓ " : ""}{x[0]}
            </span>
          </span>
        ))}
      </div>
      <DL
        pairs={[
          ["Customer", c.name],
          ["Location", `${c.city}, ${c.country}`],
          ["Customer PO", <>{o.custPO || "—"}{o.custPODate && <div className="small muted">{ds(o.custPODate)}</div>}</>],
          ["Order date", ds(o.date)],
          ["Committed delivery", ds(o.due)],
          ["Status", <Pill t={st.t} c={st.c} />],
          ["Advance", o.advance ? `${inr(o.advanceAmt)} received` : `Pending (${o.advancePct || 30}% terms)`],
          o.quote ? ["Quotation", <span className="mono">{o.quote}</span>] : null,
        ]}
      />
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Item</th><th>HSN</th><th className="num">Qty</th><th className="num">Dispatched</th><th className="num">Unit price</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {o.lines.map((l: any, i: number) => (
              <tr key={i}>
                <td className={isKid(l) ? "kid-cell" : ""}>
                  {isKid(l) && <span className="kid-mark" aria-hidden="true">↳</span>}
                  {fgBy[l.item].name}
                  <div className="cell-sub">{kindLabel(l.item)}{l.incl ? " · included in main item" : ""}</div>
                </td>
                <td className="mono small">{hsnOf(l.item)}</td>
                <td className="num">{l.qty}</td>
                <td className="num">{l.disp || 0}</td>
                <td className="num">{inr(l.price)}</td>
                <td className="num">{inr(l.qty * l.price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={5}>Net of {o.disc || 0}% discount</td><td className="num">{inr(orderValue(o))}</td></tr>
            <tr><td colSpan={5}>GST {sup === "export" ? "(export under LUT, 0%)" : sup === "intra" ? "CGST + SGST 18%" : "IGST 18%"}</td><td className="num">{inr(t.tax)}</td></tr>
            <tr><td colSpan={5}>Order value incl. GST</td><td className="num">{inr(orderValue(o) + t.tax)}</td></tr>
          </tfoot>
        </table>
      </div>
      <div>
        <h3 style={{ fontSize: 14, marginBottom: 10 }}>Work orders</h3>
        {ws.map((w: any) => {
          const s = woStages(w);
          return (
            <div key={w.id} style={{ marginBottom: 12 }}>
              <div className="small"><span className="mono">{w.id}</span> · {fgBy[w.item].name} × {w.qty} · {w.stage === s.length - 1 ? "Ready" : s[w.stage]}</div>
              <Stages stages={s} stage={w.stage} style={{ marginTop: 6 }} />
            </div>
          );
        })}
        {needWo && <p className="muted small">{o.advance ? "Some items have no work order yet." : "Production is released after the advance is received."}</p>}
      </div>
      {invs.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>Dispatches and invoices</h3>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Invoice</th><th>DC</th><th>Items</th><th className="num">Total</th><th className="num">Balance</th><th></th></tr></thead>
              <tbody>
                {invs.map((v: any) => (
                  <tr key={v.id}>
                    <td className="mono">{v.id}<div className="cell-sub" style={{ fontFamily: "var(--sans)" }}>{ds(v.date)}</div></td>
                    <td className="mono">{v.dc}</td>
                    <td>{v.lines.map((l: any, i: number) => <div key={i}>{l.qty} × {fgBy[l.item].name}</div>)}</td>
                    <td className="num">{inr(v.total)}</td>
                    <td className="num">{inr(invBal(v))}</td>
                    <td><button className="btn sm" onClick={() => openModal(<InvoiceModal id={v.id} />)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AdvanceModal({ id }: { id: string }) {
  const o = ORDERS.find((x: any) => x.id === id);
  const gross = orderValue(o) * (supplyType(custBy(o.cust)) === "export" ? 1 : 1.18);
  const due = Math.round((gross * (o.advancePct || 30)) / 100);
  const [amt, setAmt] = useState(String(Math.max(0, due - (o.advanceAmt || 0))));
  const [mode, setMode] = useState("NEFT");
  const [ref, setRef] = useState("");
  const [e, setE] = useState<Record<string, string>>({});
  const save = () => {
    const a = num(amt);
    const errs: Record<string, string> = {};
    if (!(a > 0)) errs.amt = "Enter the amount received.";
    if (!ref.trim()) errs.ref = "Enter the UTR or cheque number.";
    setE(errs);
    if (Object.keys(errs).length) return;
    o.payments.push({ date: new Date(TODAY), amt: a, mode, ref: ref.trim() });
    o.advanceAmt = (o.advanceAmt || 0) + a;
    o.advance = true;
    bump();
    openModal(<OrderDetail id={o.id} />);
    toast(`Advance of ${inr(a)} recorded for ${o.id}`);
  };
  return (
    <Modal
      title={`Advance received · ${o.id}`}
      foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Save advance</button></>}
    >
      <p>{custBy(o.cust).name} · order value {inr(orderValue(o))} + GST · advance terms {o.advancePct || 30}% = <b>{inr(due)}</b></p>
      <div className="form-grid">
        <Field id="ad-amt" label="Amount received (₹) *" err={e.amt}>
          <input className={`input num ${e.amt ? "invalid" : ""}`} id="ad-amt" type="number" min={1} step="any" value={amt} onChange={(x) => setAmt(x.target.value)} />
        </Field>
        <Field id="ad-mode" label="Mode">
          <select className="input" id="ad-mode" value={mode} onChange={(x) => setMode(x.target.value)}>
            <option>NEFT</option><option>RTGS</option><option>Cheque</option><option>SWIFT (export)</option>
          </select>
        </Field>
        <Field id="ad-ref" label="UTR / cheque no. *" err={e.ref}>
          <input className={`input ${e.ref ? "invalid" : ""}`} id="ad-ref" value={ref} onChange={(x) => setRef(x.target.value)} />
        </Field>
      </div>
      <p className="small muted">Production can be released once an advance is received. The advance is adjusted against the order's invoices.</p>
    </Modal>
  );
}

export function DispatchModal({ id }: { id: string }) {
  const o = ORDERS.find((x: any) => x.id === id);
  const c = custBy(o.cust);
  const exp = c.country !== "India";
  const rl = useMemo(() => readyLines(o), [o]);
  const sup = supplyType(c);
  const gstOk = exp || (c.gstin && GSTIN_RE.test(c.gstin) && c.gstin.slice(0, 2) === stateCode(c.state));
  const mach = rl.some((l: any) => fgBy[l.item].kind === "machine");
  const part = rl.some((l: any) => fgBy[l.item].kind === "part");
  const docs = [
    ...(exp ? ["Packing list", "Certificate of origin", "Commercial documents for customs"] : ["Packing list", "Delivery challan copy for transporter"]),
    "QC certificate",
    ...(mach ? ["FAT report and IQ/OQ protocol"] : []),
    ...(part ? ["Approved drawing and mould trial report"] : []),
  ];
  const [sel, setSel] = useState<Record<number, { on: boolean; q: string }>>(() =>
    Object.fromEntries(o.lines.map((l: any, i: number) => [i, { on: rl.includes(l), q: String(l.qty - (l.disp || 0)) }])),
  );
  const [f, setF] = useState({ veh: "", tr: "", lr: "", sb: "", ewb: "" });
  const [ticks, setTicks] = useState<boolean[]>(docs.map(() => false));
  const [e, setE] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");

  const chosen = o.lines
    .map((l: any, i: number) => (rl.includes(l) && sel[i]?.on ? { i, l, q: Math.floor(num(sel[i]!.q)) } : null))
    .filter(Boolean) as { i: number; l: any; q: number }[];
  const taxable = chosen.reduce((s, x) => s + lineRate(o, x.l) * Math.max(0, x.q), 0);
  const t = taxCalc(taxable, sup);
  const tot = Math.round(taxable + t.tax);
  const adj = Math.min(advLeft(o), tot);
  const allTicked = ticks.every(Boolean);

  const doDispatch = () => {
    if (!gstOk) return setErr("Update the customer GSTIN and state first.");
    if (!chosen.length) return setErr("Select at least one item to ship.");
    const badQ = chosen.find((x) => !(x.q >= 1) || x.q > x.l.qty - (x.l.disp || 0));
    if (badQ) return setErr(`Ship quantity for ${fgBy[badQ.l.item].name} must be between 1 and ${badQ.l.qty - (badQ.l.disp || 0)}.`);
    const errs: Record<string, string> = {};
    const veh = f.veh.trim(), tr = f.tr.trim();
    if (!veh) errs.veh = "Enter the vehicle number.";
    if (!tr) errs.tr = "Enter the transporter.";
    let ewb = "", sb = "";
    if (exp) {
      sb = f.sb.trim();
      if (!sb) errs.sb = "Enter the shipping bill number.";
    } else {
      ewb = f.ewb.replace(/\s/g, "");
      if (tot > 50000 && !/^\d{12}$/.test(ewb)) errs.ewb = "E-way bill (12 digits) is required for consignments above ₹50,000.";
      if (ewb) ewb = ewb.replace(/(\d{4})(?=\d)/g, "$1 ");
    }
    setE(errs);
    setErr("");
    if (Object.keys(errs).length) return;
    const dc: any = {
      id: "DC-0" + SEQ.dc++, date: new Date(TODAY), so: o.id,
      lines: chosen.map((x) => ({ item: x.l.item, qty: x.q, ln: o.lines.indexOf(x.l) })),
      vehicle: veh, transporter: tr, lr: f.lr.trim(), ewb, sb,
    };
    DCS.push(dc);
    chosen.forEach((x) => (x.l.disp = (x.l.disp || 0) + x.q));
    const v = makeInvoice(o, dc.lines, { dc: dc.id, vehicle: veh, transporter: tr, lr: dc.lr, ewb, sb }, undefined);
    dc.inv = v.id;
    let m = 0;
    chosen.forEach((x) => {
      if (fgBy[x.l.item].kind === "machine")
        for (let k = 0; k < x.q; k++) {
          INSTALLED.push({
            serial: `MT-${x.l.item.replace("FG-", "")}-${TODAY.getFullYear()}-${String(SEQ.serial++).padStart(3, "0")}`,
            item: x.l.item, cust: o.cust, installed: null, amcTo: null, pending: true, so: o.id, dc: dc.id,
          });
          m++;
        }
    });
    o.dispatched = o.lines.every((l: any) => (l.disp || 0) >= l.qty);
    if (o.dispatched) o.dispatchDate = new Date(TODAY);
    bump();
    toast(`${dc.id} dispatched · invoice ${v.id} for ${inr(v.total)}${m ? ` · ${m} machine${m > 1 ? "s" : ""} awaiting installation` : ""}`);
    openModal(<InvoiceModal id={v.id} />);
  };

  const inp = (k: keyof typeof f, label: string, extra: Record<string, any> = {}) => (
    <Field id={"dp-" + k} label={label} err={e[k]}>
      <input className={`input ${e[k] ? "invalid" : ""}`} id={"dp-" + k} value={f[k]} onChange={(x) => setF({ ...f, [k]: x.target.value })} {...extra} />
    </Field>
  );

  return (
    <Modal
      wide
      title={`Dispatch ${o.id}`}
      foot={
        <>
          <button className="btn" onClick={closeModal}>Cancel</button>
          <button className="btn primary" disabled={!allTicked || !gstOk} onClick={doDispatch}>Dispatch and create GST invoice</button>
        </>
      }
    >
      <p>
        {c.name}, {c.city}, {c.country} · {exp ? "Export" : "Domestic"} · {sup === "intra" ? "CGST + SGST" : sup === "inter" ? "IGST" : "Zero-rated under LUT"} · customer PO {o.custPO || "—"}
      </p>
      {!gstOk && (
        <div className="error-msg">
          The customer's GSTIN or state is missing or does not match. Update it in the customer master before invoicing.{" "}
          {canEdit("customers") && <button className="btn sm" onClick={() => openModal(<CustModal id={c.id} />)}>Update customer</button>}
        </div>
      )}
      <div className="form-section">
        <h3>Items ready to ship</h3>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th style={{ width: 40 }}></th><th>Item</th><th className="num">Ordered</th><th className="num">Dispatched</th><th className="num">Ship now</th><th className="num">Value</th></tr></thead>
            <tbody>
              {o.lines.map((l: any, i: number) => {
                const ready = rl.includes(l);
                const rem = l.qty - (l.disp || 0);
                const s = sel[i]!;
                return (
                  <tr key={i}>
                    <td>{ready && <input type="checkbox" checked={s.on} onChange={(x) => setSel({ ...sel, [i]: { ...s, on: x.target.checked } })} aria-label={`Ship ${fgBy[l.item].name}`} style={{ width: 16, height: 16, accentColor: "var(--primary)" }} />}</td>
                    <td>
                      {isKid(l) && <span className="kid-mark" aria-hidden="true">↳</span>}
                      {fgBy[l.item].name}
                      <div className="cell-sub">
                        {String(hsnOf(l.item)).startsWith("SAC") ? "" : "HSN "}{hsnOf(l.item)}{l.incl ? " · included" : ""}
                        {ready ? "" : " · " + (rem > 0 ? (isKid(l) ? "ships with main item" : "not ready yet") : "already dispatched")}
                      </div>
                    </td>
                    <td className="num">{l.qty}</td>
                    <td className="num">{l.disp || 0}</td>
                    <td className="num">
                      {ready ? <input className="input num" type="number" min={1} max={rem} step={1} value={s.q} disabled={!s.on} onChange={(x) => setSel({ ...sel, [i]: { ...s, q: x.target.value } })} style={{ width: 80 }} /> : "—"}
                    </td>
                    <td className="num">{ready ? (s.on ? inr(lineRate(o, l) * Math.max(0, Math.floor(num(s.q)))) : "Not shipping") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="inv-pay">
          <div><span className="muted small">Taxable value</span><b>{inr(taxable)}</b></div>
          <div><span className="muted small">{sup === "intra" ? "CGST + SGST 18%" : sup === "inter" ? "IGST 18%" : "IGST 0% (LUT)"}</span><b>{inr(t.tax)}</b></div>
          <div><span className="muted small">Invoice total</span><b>{inr(tot)}</b></div>
          <div><span className="muted small">Advance to adjust</span><b>{inr(adj)}</b></div>
        </div>
      </div>
      <div className="form-section">
        <h3>Transport</h3>
        <div className="form-grid">
          {inp("veh", "Vehicle number *", { placeholder: "e.g. KA 01 AB 1234" })}
          {inp("tr", "Transporter *")}
          {inp("lr", "LR / AWB number")}
          {exp ? inp("sb", "Shipping bill number *") : inp("ewb", "E-way bill number", { inputMode: "numeric", placeholder: "12 digits; required above ₹50,000" })}
        </div>
      </div>
      <div className="form-section">
        <h3>Documents packed with the consignment</h3>
        <div className="check-list">
          {docs.map((d, i) => (
            <label key={d}>
              <input type="checkbox" checked={ticks[i]} onChange={(x) => setTicks(ticks.map((t2, j) => (j === i ? x.target.checked : t2)))} /> {d}
            </label>
          ))}
        </div>
        <p className="small muted">
          {allTicked ? "All documents ready." : ticks.some(Boolean) ? `${ticks.filter(Boolean).length} of ${ticks.length} documents ticked.` : "Tick every document to enable dispatch."}
        </p>
      </div>
      <ErrLine msg={err} />
    </Modal>
  );
}

export { go };
