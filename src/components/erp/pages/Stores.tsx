// Stores: stores desk, inventory (stock card, adjustments), procurement planning and material requisitions.
import { useState } from "react";
import {
  ADJS, BOM, GATES, INDENTS, LEDGER, MRS, PEND, RM, SEQ, SESSION, USERS, WOS, ORDERS,
  altHint, fgBy, logD, mrReceipt, nextId, onOrderQty, planRows, reservedQty, rmBy, stockMove, stockStatus, storesInbox, venBy, whereUsed,
} from "@/erp/engine";
import { TODAY, addDays, ds, inr, inrShort, isoLocal, qfmt } from "@/erp/format";
import { UI, canApprove, canEdit, setUI } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { go } from "@/erp/nav";
import { DL, DocPill, ErrLine, Field, History, Modal, PageHead, Pill, Seg, closeModal, openModal, toast } from "../ui";
import { ApprovalBanner, LineEditor, QtyIn, RemarkBox, RmCell, StatusSeg, allow, edBase, edValid, fOf, numOf, refreshMrp, type Ed } from "./proc";
import { GateDetail, GrnDetail, IndentDetail, NewGrnModal, decideDoc, openIndent } from "./Purchase";

/* ================= Stores desk ================= */
function inboxAction(act: string, id: string) {
  switch (act) {
    case "mr-respond": return allow("stores") && openModal(<MrRespondModal id={id} />);
    case "indent-detail": return openModal(<IndentDetail id={id} />);
    case "mr-detail": return openModal(<MrDetail id={id} />);
    case "new-grn": return allow("grn") && openModal(<NewGrnModal gateId={id} />);
    case "grn-detail": return openModal(<GrnDetail id={id} />);
    case "gate-detail": return openModal(<GateDetail id={id} />);
    case "go-planning": return go("planning");
    case "adj-detail": return openModal(<AdjDetail id={id} />);
  }
}

const LedgerRow = ({ l, withItem }: { l: any; withItem: boolean }) => (
  <tr>
    <td className="nowrap small">{ds(l.at)}{l.time ? " · " + l.time : ""}</td>
    {withItem && <td className="clickable" onClick={() => openModal(<StockCard code={l.rm} />)}>{rmBy[l.rm].name}</td>}
    <td>{l.type}</td><td className="mono small">{l.ref}</td>
    <td className="num" style={{ color: "var(--ok)" }}>{l.qin ? qfmt(l.qin) : ""}</td>
    <td className="num" style={{ color: "var(--bad)" }}>{l.qout ? qfmt(l.qout) : ""}</td>
    <td className="num cell-title">{qfmt(l.bal)}</td>
    {!withItem && <td className="small muted">{USERS[l.by].name}</td>}
  </tr>
);

const kpiBtn = { textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" } as const;

export function StoresPage() {
  useErp();
  const inbox = storesInbox();
  const val = RM.reduce((s: number, r: any) => s + r.onHand * r.rate, 0);
  const today = LEDGER.filter((l: any) => +l.at === +TODAY && l.type !== "Balance brought forward");
  const toRespond = MRS.filter((m: any) => ["Approved", "Partly approved", "Partly issued"].includes(m.status) && m.lines.some((l: any) => l.appr - l.iss > 0)).length;
  const pr = planRows();
  return (
    <>
      <PageHead route="stores" title="Stores desk" desc={`Everything waiting for stores today, ${ds(TODAY)}: shop-floor requests, receipts, returns and replenishment.`}
        actions={[<button key="i" className="btn" onClick={() => go("inventory")}>Inventory</button>, <button key="p" className="btn primary" onClick={() => go("planning")}>Procurement planning</button>]} />
      <div className="kpis">
        <button className={`kpi ${toRespond ? "warn" : ""}`} onClick={() => go("mr")} style={kpiBtn}><span className="k-label">Shop-floor requests to respond</span><span className="k-value">{toRespond}</span><span className="k-foot">approved requisitions with balance</span></button>
        <button className="kpi" onClick={() => go("grn")} style={kpiBtn}><span className="k-label">At gate, awaiting GRN</span><span className="k-value">{GATES.filter((g: any) => g.dir === "in" && g.status === "Awaiting GRN").length}</span><span className="k-foot">create GRN and count</span></button>
        <button className={`kpi ${pr.some((x: any) => x.sug > 0) ? "alert" : ""}`} onClick={() => go("planning")} style={kpiBtn}><span className="k-label">Materials to replenish</span><span className="k-value">{pr.filter((x: any) => x.sug > 0).length}</span><span className="k-foot">reorder level or order demand</span></button>
        <button className="kpi" onClick={() => go("inventory")} style={kpiBtn}><span className="k-label">Stock value</span><span className="k-value">{inrShort(val)}</span><span className="k-foot">{RM.filter((r: any) => !r.service).length} items at sample rates</span></button>
      </div>
      <section className="card">
        <div className="card-head"><h2>Waiting for stores</h2><span className="small muted">{inbox.length} items</span></div>
        <div className="table-wrap">
          <table className="data">
            <tbody>
              {inbox.map(([c, t, src, act, id, lbl]: any, i: number) => (
                <tr key={i}>
                  <td><Pill t={c === "bad" ? "Now" : c === "warn" ? "Action" : c === "info" ? "Info" : "Waiting"} c={c} /></td>
                  <td>{t}</td><td className="small muted nowrap hide-sm">{src}</td>
                  <td className="nowrap"><button className={`btn sm ${c === "bad" || c === "warn" ? "primary" : ""}`} onClick={() => inboxAction(act, id)}>{lbl}</button></td>
                </tr>
              ))}
              {!inbox.length && <tr><td className="empty">Nothing waiting for stores.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h2>Today's stock movements</h2><button className="btn ghost sm" onClick={() => go("inventory")}>Stock ledger</button></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Time</th><th>Material</th><th>Movement</th><th>Reference</th><th className="num">In</th><th className="num">Out</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {today.slice().reverse().map((l: any, i: number) => <LedgerRow key={i} l={l} withItem />)}
              {!today.length && <tr><td colSpan={7} className="empty">No movements yet today.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ================= Inventory ================= */
export function InventoryPage() {
  useErp();
  const tab = UI.invTab || "stock";
  const q = (UI.invSearch || "").toLowerCase();
  const f = UI.invF || "all";
  const items = RM.filter((r: any) => !r.service)
    .map((r: any) => ({ r, res: reservedQty(r.code), oo: onOrderQty(r.code) }))
    .filter((x: any) => (!q || x.r.name.toLowerCase().includes(q) || x.r.code.toLowerCase().includes(q) || x.r.bin.toLowerCase().includes(q)) && (f === "all" || (f === "low" && x.r.onHand < x.r.reorder) || (f === "res" && x.res > 0)));
  const val = RM.reduce((s: number, r: any) => s + r.onHand * r.rate, 0);
  const resVal = RM.reduce((s: number, r: any) => s + reservedQty(r.code) * r.rate, 0);
  const low = RM.filter((r: any) => !r.service && r.onHand < r.reorder).length;
  const moves = LEDGER.filter((l: any) => l.type !== "Balance brought forward");
  return (
    <>
      <PageHead route="inventory" title="Inventory" desc="Stock by item and bin, with what is reserved for approved requisitions and what is free to issue. Open an item for its stock card."
        actions={[<button key="a" className="btn primary" onClick={() => openAdj()}>Stock adjustment</button>]} />
      <ApprovalBanner t="adj" items={ADJS} label="stock adjustment" />
      <div className="kpis">
        <div className="kpi"><span className="k-label">Stock value</span><span className="k-value">{inrShort(val)}</span><span className="k-foot">at sample rates</span></div>
        <div className="kpi"><span className="k-label">Reserved for shop floor</span><span className="k-value">{inrShort(resVal)}</span><span className="k-foot">approved, not yet issued</span></div>
        <div className={`kpi ${low ? "warn" : ""}`}><span className="k-label">Below reorder level</span><span className="k-value">{low}</span><span className="k-foot">see procurement planning</span></div>
        <div className="kpi"><span className="k-label">Movements this month</span><span className="k-value">{moves.length}</span><span className="k-foot">receipts, issues, returns, adjustments</span></div>
      </div>
      <div className="toolbar">
        <Seg value={tab} onChange={(v) => setUI({ invTab: v })} options={[["stock", "Stock"], ["ledger", "Stock ledger"], ["adj", `Adjustments (${ADJS.length})`]]} />
        {tab === "stock" && (
          <>
            <Seg label="Filter" value={f} onChange={(v) => setUI({ invF: v })} options={[["all", "All"], ["low", "Below reorder"], ["res", "Reserved"]]} />
          </>
        )}
      </div>
      {tab === "stock" && (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Item</th><th>Bin</th><th className="num">On hand</th><th className="num">Reserved</th><th className="num">Available</th><th className="num">On order</th><th className="num">Reorder / max</th><th className="num">Value</th><th>Status</th></tr></thead>
              <tbody>
                {items.map(({ r, res, oo }: any) => {
                  const st = stockStatus(r);
                  return (
                    <tr key={r.code} className="clickable" onClick={() => openModal(<StockCard code={r.code} />)}>
                      <td style={{ minWidth: 200 }}>{r.name}<div className="cell-sub mono">{r.code}</div></td>
                      <td className="small nowrap">{r.bin}</td>
                      <td className="num">{qfmt(r.onHand)} {r.uom}<div className="cell-sub">{altHint(r.code, r.onHand)}</div></td>
                      <td className="num">{res ? qfmt(res) : "—"}</td>
                      <td className="num cell-title" style={r.onHand - res < 0 ? { color: "var(--bad)" } : undefined}>{qfmt(r.onHand - res)}</td>
                      <td className="num">{oo ? qfmt(oo) : "—"}</td>
                      <td className="num nowrap">{qfmt(r.reorder)} / {qfmt(r.max)}</td>
                      <td className="num">{inr(r.onHand * r.rate)}</td>
                      <td><Pill t={st.t} c={st.c} /></td>
                    </tr>
                  );
                })}
                {!items.length && <tr><td colSpan={9} className="empty">No items match.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "ledger" && (
        <section className="card">
          <div className="card-head"><h2>Stock ledger</h2><span className="small muted">Every receipt, issue, return and adjustment, newest first</span></div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Date</th><th>Material</th><th>Movement</th><th>Reference</th><th className="num">In</th><th className="num">Out</th><th className="num">Balance</th></tr></thead>
              <tbody>
                {moves.slice().reverse().map((l: any, i: number) => <LedgerRow key={i} l={l} withItem />)}
                {!moves.length && <tr><td colSpan={7} className="empty">No movements.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "adj" && (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Adjustment</th><th>Material</th><th className="num">System</th><th className="num">Counted</th><th className="num">Difference</th><th>Reason</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {ADJS.slice().reverse().map((a: any) => {
                  const mine = canApprove("adj") && a.status === PEND;
                  return (
                    <tr key={a.id} className="clickable" onClick={() => openModal(<AdjDetail id={a.id} />)}>
                      <td className="mono cell-title">{a.id}<div className="cell-sub" style={{ fontFamily: "var(--sans)" }}>{ds(a.date)} · {USERS[a.by].name}</div></td>
                      <td>{rmBy[a.rm].name}</td><td className="num">{qfmt(a.system)}</td><td className="num">{qfmt(a.counted)}</td>
                      <td className="num" style={{ color: a.counted < a.system ? "var(--bad)" : "var(--ok)", fontWeight: 600 }}>{a.counted > a.system ? "+" : ""}{qfmt(a.counted - a.system)}</td>
                      <td style={{ minWidth: 200 }}>{a.reason}</td><td><DocPill st={a.status} /></td>
                      <td><button className={`btn sm ${mine ? "primary" : ""}`}>{mine ? "Review" : "Open"}</button></td>
                    </tr>
                  );
                })}
                {!ADJS.length && <tr><td colSpan={8} className="empty">No stock adjustments.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

export function StockCard({ code }: { code: string }) {
  const r = rmBy[code];
  const res = reservedQty(code);
  const led = LEDGER.filter((l: any) => l.rm === code);
  const used = whereUsed(code).map((c: string) => fgBy[c].name);
  return (
    <Modal wide title={`Stock card · ${r.name}`}
      foot={
        <>
          <button className="btn" onClick={closeModal}>Close</button>
          {canEdit("inventory") && <button className="btn" onClick={() => openAdj(code)}>Stock adjustment</button>}
          {canEdit("indent") && !r.service && <button className="btn primary" onClick={() => planIndent([code])}>Raise indent</button>}
        </>
      }>
      <DL pairs={[
        ["Code", <span className="mono">{r.code}</span>], ["Bin", r.bin],
        ["On hand", <>{qfmt(r.onHand)} {r.uom}{altHint(code, r.onHand) && <div className="small muted">{altHint(code, r.onHand)}</div>}</>],
        ["Units", <>{r.uom}{(r.alt || []).map((a: any) => <div key={a.u} className="small muted">1 {a.u} = {qfmt(a.f)} {r.uom}</div>)}</>],
        ["Reserved", qfmt(res)], ["Available", <b>{qfmt(r.onHand - res)}</b>], ["On order", qfmt(onOrderQty(code))],
        ["Reorder / max", `${qfmt(r.reorder)} / ${qfmt(r.max)}`], ["Lead time · vendor", `${r.lead} days · ${venBy(r.vendor).name}`],
      ]} />
      <p className="small muted">Used in: {used.length ? used.join(", ") : "no current BOM"}</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Date</th><th>Movement</th><th>Reference</th><th className="num">In</th><th className="num">Out</th><th className="num">Balance</th><th>By</th></tr></thead>
          <tbody>{led.slice().reverse().map((l: any, i: number) => <LedgerRow key={i} l={l} withItem={false} />)}</tbody>
        </table>
      </div>
    </Modal>
  );
}

export function openAdj(code?: string) {
  if (!allow("inventory")) return;
  openModal(<AdjModal code={code || RM.find((r: any) => !r.service).code} />);
}

function AdjModal({ code }: { code: string }) {
  const [rm, setRm] = useState(code);
  const [cnt, setCnt] = useState("");
  const [reason, setReason] = useState("");
  const [e, setE] = useState<Record<string, string>>({});
  const save = () => {
    if (!allow("inventory")) return;
    const sys = rmBy[rm].onHand;
    const errs: Record<string, string> = {};
    if (cnt === "" || parseFloat(cnt) < 0) errs.cnt = "Enter the counted quantity.";
    else if (parseFloat(cnt) === sys) errs.cnt = "Counted equals system quantity: no adjustment needed.";
    if (!reason.trim()) errs.reason = "Give the reason for the difference.";
    setE(errs);
    if (Object.keys(errs).length) return;
    const d: any = { id: "ADJ-00" + SEQ.adj++, date: new Date(TODAY), by: SESSION.user, rm, system: sys, counted: parseFloat(cnt), reason: reason.trim(), status: PEND, history: [] };
    logD(d, "Submitted for approval", "", "info");
    ADJS.push(d);
    UI.invTab = "adj";
    closeModal(); go("inventory"); bump(); toast(`${d.id} submitted for approval`);
  };
  return (
    <Modal title="Stock adjustment" foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Submit for approval</button></>}>
      <p className="muted">Use after a physical count. The difference is posted to stock only after approval.</p>
      <div className="form-grid">
        <Field id="aj-rm" label="Material" span>
          <select className="input" id="aj-rm" value={rm} onChange={(x) => setRm(x.target.value)}>
            {RM.filter((r: any) => !r.service).map((r: any) => <option key={r.code} value={r.code}>{r.name} · {r.bin}</option>)}
          </select>
        </Field>
        <Field label="System quantity">
          <div className="input num" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", background: "var(--surface-2)" }}>{qfmt(rmBy[rm].onHand)}</div>
        </Field>
        <Field id="aj-cnt" label="Counted quantity *" err={e.cnt}><input className={`input num ${e.cnt ? "invalid" : ""}`} id="aj-cnt" type="number" min={0} step="any" value={cnt} onChange={(x) => setCnt(x.target.value)} /></Field>
        <Field id="aj-reason" label="Reason *" err={e.reason} span>
          <input className={`input ${e.reason ? "invalid" : ""}`} id="aj-reason" value={reason} onChange={(x) => setReason(x.target.value)} placeholder="e.g. damaged in storage, counting error in last GRN" />
        </Field>
      </div>
    </Modal>
  );
}

function AdjDetail({ id }: { id: string }) {
  const a = ADJS.find((x: any) => x.id === id);
  const ap = a.status === PEND && canApprove("adj");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const decide = (v: "approve" | "reject") => {
    if (!canApprove("adj")) return toast("Your role cannot approve stock adjustments.", true);
    const n = note.trim();
    if (v === "reject") {
      if (!n) return setErr("Give a reason for rejecting.");
      a.status = "Rejected"; logD(a, "Rejected", n, "bad");
    } else {
      const diff = a.counted - rmBy[a.rm].onHand;
      stockMove(a.rm, diff, "Stock adjustment", a.id);
      a.status = "Approved";
      logD(a, "Approved and posted", `${diff > 0 ? "+" : ""}${qfmt(diff)} ${rmBy[a.rm].uom} posted to stock.${n ? " " + n : ""}`, "ok");
    }
    closeModal(); bump(); toast(`${a.id} ${a.status === "Approved" ? "approved and posted" : "rejected"}`);
  };
  return (
    <Modal title={`Stock adjustment ${a.id}`}
      foot={ap
        ? <><button className="btn" onClick={closeModal}>Cancel</button><button className="btn" onClick={() => decide("reject")} style={{ color: "var(--bad)" }}>Reject</button><button className="btn primary" onClick={() => decide("approve")}>Approve and post</button></>
        : <button className="btn primary" onClick={closeModal}>Close</button>}>
      <DL pairs={[
        ["Material", rmBy[a.rm].name], ["Bin", rmBy[a.rm].bin], ["System", qfmt(a.system)], ["Counted", qfmt(a.counted)],
        ["Difference", <b style={{ color: a.counted < a.system ? "var(--bad)" : "var(--ok)" }}>{a.counted > a.system ? "+" : ""}{qfmt(a.counted - a.system)} {rmBy[a.rm].uom}</b>],
        ["Value", inr(Math.abs(a.counted - a.system) * rmBy[a.rm].rate)], ["Status", <DocPill st={a.status} />],
      ]} />
      <p><b>Reason:</b> {a.reason}</p>
      {ap && <div className="approval-box"><h3 style={{ fontSize: 14 }}>Your decision</h3><RemarkBox label="Remarks" ph="Required when rejecting" value={note} onChange={setNote} err={err} /></div>}
      <History items={a.history} />
    </Modal>
  );
}

/* ================= Procurement planning ================= */
function planIndent(codes: string[]) {
  if (!allow("indent")) return;
  const rows = planRows().filter((x: any) => codes.includes(x.r.code));
  if (!rows.length) return toast("Tick at least one line to buy.", true);
  const lines = rows.map((x: any) => ({ rm: x.r.code, qty: x.sug > 0 ? x.sug : Math.max(1, Math.ceil(x.r.max - x.r.onHand)) }));
  const why = rows.map((x: any) => (x.why === "Order demand" ? "order demand" : "reorder level")).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(" and ");
  closeModal();
  openIndent({
    source: "Procurement planning", dept: "Stores & purchase", reason: `Replenishment from procurement planning (${why})`, lines,
    needBy: isoLocal(addDays(TODAY, Math.max(...rows.map((x: any) => x.r.lead)))),
  });
}

export function PlanningPage() {
  useErp();
  const all = planRows();
  const show = UI.planAll ? all : all.filter((x: any) => x.sug > 0);
  if (!UI.planSel) UI.planSel = new Set(all.filter((x: any) => x.sug > 0).map((x: any) => x.r.code));
  const toggle = (code: string, on: boolean) => { const s = new Set(UI.planSel); if (on) s.add(code); else s.delete(code); setUI({ planSel: s }); };
  return (
    <>
      <PageHead route="planning" title="Procurement planning" desc="Replenishment plan from reorder levels and open-order demand, net of stock, reservations and what is already on order. Tick the lines to buy and raise one indent."
        actions={canEdit("indent") ? [<button key="r" className="btn primary" onClick={() => planIndent([...UI.planSel])}>Raise indent for selected</button>] : undefined} />
      <div className="tip">Projected = on hand + on order − reserved − open-order demand. When projected falls below the reorder level, the suggestion tops it up to the maximum level. Need-by date = today + the item's lead time.</div>
      <div className="toolbar">
        <Seg label="Show" value={!!UI.planAll} onChange={(v) => setUI({ planAll: v })} options={[[false, `Needs action (${all.filter((x: any) => x.sug > 0).length})`], [true, `All items (${all.length})`]]} />
      </div>
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th style={{ width: 36 }}><span style={{ position: "absolute", left: -9999 }}>Select</span></th><th>Item</th><th className="num">On hand</th><th className="num">Reserved</th><th className="num">On order</th><th className="num">Order demand</th><th className="num">Projected</th><th className="num">Reorder / max</th><th className="num">Suggested</th><th>Why</th><th>Lead time · vendor</th></tr></thead>
            <tbody>
              {show.map((x: any) => {
                const r = x.r;
                return (
                  <tr key={r.code}>
                    <td>{x.sug > 0 && <input type="checkbox" checked={UI.planSel.has(r.code)} onChange={(e) => toggle(r.code, e.target.checked)} aria-label={`Select ${r.name}`} style={{ width: 16, height: 16, accentColor: "var(--primary)" }} />}</td>
                    <td style={{ minWidth: 190 }} className="clickable" onClick={() => openModal(<StockCard code={r.code} />)}>{r.name}<div className="cell-sub mono">{r.code}</div></td>
                    <td className="num">{qfmt(r.onHand)}</td><td className="num">{x.res ? qfmt(x.res) : "—"}</td><td className="num">{x.oo ? qfmt(x.oo) : "—"}</td><td className="num">{x.need ? qfmt(x.need) : "—"}</td>
                    <td className="num cell-title" style={x.proj < r.reorder ? { color: "var(--bad)" } : undefined}>{qfmt(x.proj)}</td>
                    <td className="num nowrap">{qfmt(r.reorder)} / {qfmt(r.max)}</td>
                    <td className="num cell-title">{x.sug ? qfmt(x.sug) + " " + r.uom : "—"}</td>
                    <td><Pill t={x.why} c={x.why === "Covered" ? "ok" : x.why === "Order demand" ? "bad" : "warn"} /></td>
                    <td className="small nowrap">{r.lead} days · {venBy(r.vendor).name}<div className="cell-sub">need by {ds(addDays(TODAY, r.lead))}</div></td>
                  </tr>
                );
              })}
              {!show.length && <tr><td colSpan={11} className="empty">Nothing to buy: every item is covered.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ================= Material requisition ================= */
export function MrPage() {
  useErp();
  const toIssue = MRS.filter((m: any) => ["Approved", "Partly approved", "Partly issued"].includes(m.status));
  const toConfirm = MRS.filter((m: any) => m.lines.some((l: any) => l.iss - (l.rcv || 0) - (l.rrej || 0) > 0));
  const list = fOf("mr", MRS).slice().reverse();
  return (
    <>
      <PageHead route="mr" title="Material requisition" desc="Production asks stores for material, usually against a work order. Approve in full or part; stores issues in full or part; production confirms what it received and can reject wrong or damaged material back to stores."
        actions={[<button key="n" className="btn primary" onClick={() => allow("mr") && openModal(<NewMrModal />)}>New requisition</button>]} />
      <ApprovalBanner t="mr" items={MRS} label="requisition" />
      {canEdit("mr") && toIssue.length > 0 && (
        <div className="banner warn">
          <span><b>{toIssue.length} approved requisition{toIssue.length > 1 ? "s" : ""} to issue:</b> {toIssue.map((m: any) => m.id).join(", ")}</span>
          <button className="btn sm primary" onClick={() => openModal(<MrIssueModal id={toIssue[0].id} />)}>Issue material</button>
        </div>
      )}
      {canEdit("mr") && toConfirm.length > 0 && (
        <div className="banner info">
          <span><b>{toConfirm.length} issue{toConfirm.length > 1 ? "s" : ""} waiting for production to confirm receipt:</b> {toConfirm.map((m: any) => m.id).join(", ")}</span>
          <button className="btn sm primary" onClick={() => openModal(<MrRcvModal id={toConfirm[0].id} />)}>Confirm receipt</button>
        </div>
      )}
      <StatusSeg k="mr" items={MRS} order={["all", PEND, "Approved", "Partly approved", "Partly issued", "Issued", "Rejected"]} />
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Requisition</th><th>Raised by</th><th>Work order · purpose</th><th className="num">Lines</th><th className="num">Issued</th><th>Receipt by production</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((m: any) => {
                const mine = canApprove("mr") && m.status === PEND;
                const a = m.lines.reduce((s: number, l: any) => s + l.appr, 0), i = m.lines.reduce((s: number, l: any) => s + l.iss, 0);
                const r = mrReceipt(m);
                return (
                  <tr key={m.id} className="clickable" onClick={() => openModal(<MrDetail id={m.id} />)}>
                    <td className="nowrap"><div className="cell-title mono">{m.id}</div><div className="cell-sub">{ds(m.date)}</div></td>
                    <td>{USERS[m.by].name}</td>
                    <td style={{ minWidth: 220 }}>{m.wo && <><span className="mono">{m.wo}</span> · </>}{m.purpose}</td>
                    <td className="num">{m.lines.length}</td>
                    <td className="num">{m.status === PEND || m.status === "Rejected" ? "—" : Math.round((i / Math.max(a, 1e-9)) * 100) + "%"}</td>
                    <td>{r ? <Pill t={r.t} c={r.c} /> : <span className="muted small">—</span>}</td>
                    <td><DocPill st={m.status} /></td>
                    <td><button className={`btn sm ${mine ? "primary" : ""}`}>{mine ? "Review" : "Open"}</button></td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={8} className="empty">No requisitions with this status.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function NewMrModal() {
  const [ed, setEd] = useState<Ed>({ grp: false, uom: true, lines: [{ rm: "", qty: "" }] });
  const wos = WOS.filter((w: any) => { const o = ORDERS.find((x: any) => x.id === w.so); return o && !o.dispatched && !w.issued; });
  const [wo, setWo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [e, setE] = useState<Record<string, string>>({});
  const fill = () => {
    const w = WOS.find((x: any) => x.id === wo);
    if (!w) return toast("Choose a work order first.", true);
    const lines = (BOM[w.item] || []).filter((b: any) => !rmBy[b[1]].service).reduce((acc: any[], b: any) => {
      const ex = acc.find((x) => x.rm === b[1]);
      if (ex) ex.qty += b[2] * w.qty; else acc.push({ rm: b[1], qty: b[2] * w.qty });
      return acc;
    }, []);
    setEd({ ...ed, lines });
    if (!purpose) setPurpose(`${fgBy[w.item].name} × ${w.qty} for ${w.so}`);
    toast(`${lines.length} lines filled from the ${fgBy[w.item].name} BOM`);
  };
  const save = () => {
    if (!allow("mr")) return;
    const p = purpose.trim(), err = edValid(ed);
    setE({ purpose: p ? "" : "Enter the purpose.", ed: err });
    if (!p || err) return;
    const m: any = { id: nextId("MR"), date: new Date(TODAY), by: SESSION.user, wo: wo || null, purpose: p, status: PEND, lines: edBase(ed).map((l) => ({ rm: l.rm, qty: l.qty, appr: l.qty, iss: 0, rcv: 0, rrej: 0, ind: null })), history: [] };
    logD(m, "Submitted for approval", "", "info");
    MRS.push(m);
    UI.f.mr = "all";
    closeModal(); go("mr"); bump(); toast(`${m.id} submitted for approval`);
  };
  return (
    <Modal wide title="New material requisition" foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Submit for approval</button></>}>
      <div className="form-grid">
        <Field id="mr-wo" label="Work order">
          <div style={{ display: "flex", gap: 8 }}>
            <select className="input" id="mr-wo" value={wo} onChange={(x) => setWo(x.target.value)}>
              <option value="">None (general use)</option>
              {wos.map((w: any) => <option key={w.id} value={w.id}>{w.id} · {fgBy[w.item].name} × {w.qty}</option>)}
            </select>
            <button type="button" className="btn" onClick={fill}>Fill from BOM</button>
          </div>
        </Field>
        <Field id="mr-purpose" label="Purpose *" err={e.purpose}>
          <input className={`input ${e.purpose ? "invalid" : ""}`} id="mr-purpose" value={purpose} onChange={(x) => setPurpose(x.target.value)} placeholder="e.g. Frame fabrication for SO-2602" />
        </Field>
      </div>
      <LineEditor ed={ed} onChange={setEd} />
      <ErrLine msg={e.ed} />
    </Modal>
  );
}

export function MrDetail({ id }: { id: string }) {
  const m = MRS.find((x: any) => x.id === id);
  const ap = m.status === PEND && canApprove("mr");
  const canIss = ["Approved", "Partly approved", "Partly issued"].includes(m.status) && canEdit("mr");
  const canRcv = m.lines.some((l: any) => l.iss - (l.rcv || 0) - (l.rrej || 0) > 0) && canEdit("mr");
  const [q, setQ] = useState<Record<string, string>>(() => Object.fromEntries(m.lines.map((l: any, i: number) => ["ap-q-" + i, String(l.qty)])));
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const decide = (v: "approve" | "reject") => { const r = decideDoc("mr", m.id, v, note.trim(), q); if (r) setErr(r); };
  const rec = mrReceipt(m);
  let foot: any;
  if (ap) foot = <><button className="btn" onClick={closeModal}>Cancel</button><button className="btn" onClick={() => decide("reject")} style={{ color: "var(--bad)" }}>Reject</button><button className="btn primary" onClick={() => decide("approve")}>Approve</button></>;
  else
    foot = (
      <>
        <button className="btn" onClick={closeModal}>Close</button>
        {m.status === "Needs clarification" && canEdit("mr") && <button className="btn primary" onClick={() => openModal(<MrReplyModal id={m.id} />)}>Answer stores</button>}
        {canIss && canEdit("stores") && <button className="btn primary" onClick={() => openModal(<MrRespondModal id={m.id} />)}>Respond: issue or indent</button>}
        {canIss && !canEdit("stores") && <button className="btn primary" onClick={() => openModal(<MrIssueModal id={m.id} />)}>Issue material</button>}
        {canRcv && <button className={`btn ${canIss ? "" : "primary"}`} onClick={() => openModal(<MrRcvModal id={m.id} />)}>Confirm receipt</button>}
      </>
    );
  return (
    <Modal wide title={`Material requisition ${m.id}`} foot={foot}>
      <DL pairs={[["Raised by", USERS[m.by].name], ["Date", ds(m.date)], ["Work order", m.wo ? <span className="mono">{m.wo}</span> : "—"], ["Status", <DocPill st={m.status} />], rec ? ["Receipt", <Pill t={rec.t} c={rec.c} />] : null]} />
      <p><b>Purpose:</b> {m.purpose}</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">In stock</th><th className="num">Requested</th><th className="num">Approved</th><th className="num">Issued</th><th className="num">Received</th><th className="num">Rejected back</th></tr></thead>
          <tbody>
            {m.lines.map((l: any, i: number) => (
              <tr key={i}>
                <td><RmCell code={l.rm} /></td><td className="num">{qfmt(rmBy[l.rm].onHand)}</td><td className="num">{qfmt(l.qty)} {rmBy[l.rm].uom}</td>
                <td className="num">{ap ? <QtyIn value={q["ap-q-" + i]} max={l.qty} onChange={(v) => setQ({ ...q, ["ap-q-" + i]: v })} /> : m.status === PEND ? "—" : qfmt(l.appr)}</td>
                <td className="num">{qfmt(l.iss)}{l.ind && l.iss < l.appr && <div className="cell-sub">awaiting stock · <span className="mono">{l.ind}</span></div>}</td>
                <td className="num">{qfmt(l.rcv || 0)}</td>
                <td className="num">{l.rrej ? <span style={{ color: "var(--bad)", fontWeight: 600 }} title={l.rreason || ""}>{qfmt(l.rrej)}</span> : "0"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ap && (
        <div className="approval-box">
          <h3 style={{ fontSize: 14 }}>Your decision</h3>
          <p className="small muted">Lower a quantity to approve part of a line. A remark is required for a partial approval or a rejection.</p>
          <RemarkBox label={`Remarks to ${USERS[m.by].name}`} value={note} onChange={setNote} err={err} />
        </div>
      )}
      <History items={m.history} />
    </Modal>
  );
}

function MrIssueModal({ id }: { id: string }) {
  const m = MRS.find((x: any) => x.id === id);
  const [q, setQ] = useState<Record<number, string>>(() => Object.fromEntries(m.lines.map((l: any, i: number) => [i, String(Math.min(Math.max(0, l.appr - l.iss), rmBy[l.rm].onHand))])));
  const [err, setErr] = useState("");
  const save = () => {
    if (!allow("mr")) return;
    const qs = m.lines.map((l: any, i: number) => (l.appr - l.iss > 0 ? Math.max(0, numOf(q[i])) : 0));
    const bad = m.lines.findIndex((l: any, i: number) => qs[i] > l.appr - l.iss + 1e-9 || qs[i] > rmBy[l.rm].onHand + 1e-9);
    if (bad >= 0) return setErr(`${rmBy[m.lines[bad].rm].name}: issue quantity is more than the balance or the stock.`);
    if (qs.every((x: number) => x === 0)) return setErr("Enter a quantity on at least one line.");
    m.lines.forEach((l: any, i: number) => { l.iss += qs[i]; stockMove(l.rm, -qs[i], "Issue to production", m.id + (m.wo ? " · " + m.wo : "")); });
    m.status = m.lines.every((l: any) => l.iss >= l.appr) ? "Issued" : "Partly issued";
    logD(m, m.status === "Issued" ? "Material issued" : "Partly issued", `${qs.filter((x: number) => x > 0).length} line(s) issued.`, m.status === "Issued" ? "ok" : "warn");
    if (m.status === "Issued" && m.wo) { const w = WOS.find((x: any) => x.id === m.wo); if (w) w.issued = true; }
    refreshMrp(); closeModal(); bump(); toast(`${m.id}: ${m.status.toLowerCase()}`);
  };
  return (
    <Modal wide title={`Issue material · ${m.id}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Issue</button></>}>
      <p className="muted">Issue the full balance or part of it. Quantities are limited to the approved balance and stock on hand.</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">Balance</th><th className="num">In stock</th><th className="num">Issue now</th></tr></thead>
          <tbody>
            {m.lines.map((l: any, i: number) => {
              const b = Math.max(0, l.appr - l.iss), st = rmBy[l.rm].onHand;
              if (!(b > 0)) return null;
              return (
                <tr key={i}>
                  <td><RmCell code={l.rm} /></td>
                  <td className="num">{qfmt(b)} {rmBy[l.rm].uom}<div className="cell-sub">{altHint(l.rm, b)}</div></td>
                  <td className="num" style={st < b ? { color: "var(--bad)", fontWeight: 600 } : undefined}>{qfmt(st)}</td>
                  <td className="num"><QtyIn value={q[i]} max={Math.min(b, st)} onChange={(v) => setQ({ ...q, [i]: v })} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ErrLine msg={err} />
    </Modal>
  );
}

function MrRcvModal({ id }: { id: string }) {
  const m = MRS.find((x: any) => x.id === id);
  const pndOf = (l: any) => l.iss - (l.rcv || 0) - (l.rrej || 0);
  const [rows, setRows] = useState<Record<number, { a: string; r: string; rs: string }>>(() => Object.fromEntries(m.lines.map((l: any, i: number) => [i, { a: String(pndOf(l)), r: "0", rs: "" }])));
  const [err, setErr] = useState("");
  const setRow = (i: number, patch: any) => setRows({ ...rows, [i]: { ...rows[i], ...patch } });
  const save = () => {
    if (!allow("mr")) return;
    let bad = "", any = false;
    const vals = m.lines.map((l: any, i: number) => {
      const pnd = pndOf(l);
      if (!(pnd > 0)) return null;
      const a = numOf(rows[i].a), r = numOf(rows[i].r), rs = rows[i].rs.trim();
      if (a + r > pnd + 1e-9) bad = `${rmBy[l.rm].name}: received plus rejected is more than issued.`;
      if (r > 0 && !rs) bad = `${rmBy[l.rm].name}: give a reason for the rejection.`;
      if (a + r > 0) any = true;
      return { a, r, rs };
    });
    if (!any) bad = bad || "Enter a received or rejected quantity on at least one line.";
    if (bad) return setErr(bad);
    const rejTxt: string[] = [];
    m.lines.forEach((l: any, i: number) => {
      const v = vals[i];
      if (!v) return;
      l.rcv = (l.rcv || 0) + v.a;
      if (v.r > 0) {
        l.rrej = (l.rrej || 0) + v.r; l.rreason = v.rs;
        stockMove(l.rm, v.r, "Returned by production", m.id + ": " + v.rs);
        rejTxt.push(`${qfmt(v.r)} ${rmBy[l.rm].uom} ${rmBy[l.rm].name}: ${v.rs}`);
      }
    });
    const r = mrReceipt(m);
    logD(m, rejTxt.length ? "Receipt confirmed, part rejected" : "Receipt confirmed", rejTxt.length ? "Returned to stores: " + rejTxt.join("; ") : "", rejTxt.length ? "warn" : "ok");
    closeModal(); bump(); toast(`${m.id}: ${(r?.t || "").toLowerCase()}${rejTxt.length ? "; rejected material is back in stores stock" : ""}`);
  };
  return (
    <Modal wide title={`Confirm receipt · ${m.id}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Confirm</button></>}>
      <p className="muted">Confirm what production actually received from stores. Anything wrong or damaged can be rejected; it goes back into stores stock.</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">Issued, unconfirmed</th><th className="num">Received OK</th><th className="num">Rejected</th><th>Reason</th></tr></thead>
          <tbody>
            {m.lines.map((l: any, i: number) => {
              const pnd = pndOf(l);
              if (!(pnd > 0)) return null;
              return (
                <tr key={i}>
                  <td><RmCell code={l.rm} /></td><td className="num">{qfmt(pnd)} {rmBy[l.rm].uom}</td>
                  <td className="num"><QtyIn value={rows[i].a} max={pnd} onChange={(v) => setRow(i, { a: v })} /></td>
                  <td className="num"><QtyIn value={rows[i].r} max={pnd} onChange={(v) => setRow(i, { r: v })} /></td>
                  <td style={{ minWidth: 170 }}><input className="input" value={rows[i].rs} onChange={(e) => setRow(i, { rs: e.target.value })} placeholder="If any rejected" aria-label="Rejection reason" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ErrLine msg={err} />
    </Modal>
  );
}

function MrRespondModal({ id }: { id: string }) {
  const m = MRS.find((x: any) => x.id === id);
  const [rows, setRows] = useState<Record<number, { q: string; ind: boolean }>>(() =>
    Object.fromEntries(m.lines.map((l: any, i: number) => {
      const b = Math.max(0, l.appr - l.iss), iq = Math.min(b, rmBy[l.rm].onHand);
      return [i, { q: String(iq), ind: b - iq > 0 }];
    })),
  );
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const setQ = (i: number, v: string) => {
    const l = m.lines[i];
    const sh = Math.max(0, l.appr - l.iss - (parseFloat(v) || 0));
    setRows({ ...rows, [i]: { q: v, ind: sh > 0 } });
  };
  const save = () => {
    if (!allow("stores")) return;
    let bad = "";
    m.lines.forEach((l: any, i: number) => {
      const b = l.appr - l.iss;
      if (!(b > 0)) return;
      const q = Math.max(0, numOf(rows[i].q));
      if (q > b + 1e-9 || q > rmBy[l.rm].onHand + 1e-9) bad = `${rmBy[l.rm].name}: issue quantity is more than the balance or the stock.`;
    });
    if (bad) return toast(bad, true);
    const issued: string[] = [], ind: any[] = [];
    m.lines.forEach((l: any, i: number) => {
      if (!(l.appr - l.iss > 0)) return;
      const q = Math.max(0, numOf(rows[i].q));
      if (q > 0) { l.iss += q; stockMove(l.rm, -q, "Issue to production", m.id + (m.wo ? " · " + m.wo : "")); issued.push(`${qfmt(q)} ${rmBy[l.rm].uom} ${rmBy[l.rm].name}`); }
      if (!l.ind && rows[i].ind && l.appr - l.iss > 0) ind.push({ l, qty: Math.ceil(l.appr - l.iss) });
    });
    let indId: string | null = null;
    if (ind.length) {
      const d: any = {
        id: nextId("IND"), date: new Date(TODAY), by: SESSION.user, dept: "Stores & purchase", source: `Shop-floor request ${m.id}`,
        needBy: addDays(TODAY, Math.max(...ind.map((x) => rmBy[x.l.rm].lead || 7))), reason: `Shortfall against ${m.id}${m.wo ? " for " + m.wo : ""}: ${m.purpose}`,
        status: PEND, lines: ind.map((x) => ({ rm: x.l.rm, qty: x.qty, appr: x.qty, po: 0 })), history: [],
      };
      logD(d, "Submitted for approval", `Raised by stores for the shortfall on ${m.id}.`, "info");
      INDENTS.push(d);
      ind.forEach((x) => (x.l.ind = d.id));
      indId = d.id;
    }
    if (!issued.length && !indId) return toast("Nothing to do: enter an issue quantity or tick Indent for a shortfall.", true);
    m.status = m.lines.every((l: any) => l.iss >= l.appr) ? "Issued" : m.lines.some((l: any) => l.iss > 0) ? "Partly issued" : m.status;
    if (m.status === "Issued" && m.wo) { const w = WOS.find((x: any) => x.id === m.wo); if (w) w.issued = true; }
    logD(m, "Stores responded", [issued.length ? "Issued: " + issued.join(", ") + "." : "", indId ? `Shortfall indented on ${indId}.` : "", note.trim()].filter(Boolean).join(" "), m.status === "Issued" ? "ok" : "warn");
    refreshMrp(); closeModal(); bump();
    toast(`${m.id}: ${issued.length ? issued.length + " line(s) issued" : "no issue"}${indId ? `; ${indId} raised for the shortfall` : ""}`);
  };
  const clarify = () => {
    if (!allow("stores")) return;
    if (!note.trim()) return setErr("Write what you need to know.");
    m.prevStatus = m.status; m.status = "Needs clarification";
    logD(m, "Clarification requested by stores", note.trim(), "warn");
    closeModal(); bump(); toast(`${m.id} sent back to ${USERS[m.by].name} for clarification`);
  };
  return (
    <Modal wide title={`Respond to ${m.id}`}
      foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn" onClick={clarify}>Send back for clarification</button><button className="btn primary" onClick={save}>Issue and respond</button></>}>
      <p>{USERS[m.by].name} · {m.wo && <><span className="mono">{m.wo}</span> · </>}{m.purpose}</p>
      <p className="small muted">Issue what stores has now. For any shortfall, tick <b>Indent</b> to raise a purchase indent linked to this requisition. Or send it back to the requester for clarification.</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material · bin</th><th className="num">To issue</th><th className="num">On hand</th><th className="num">Issue now</th><th className="num">Shortfall</th><th>Indent shortfall</th></tr></thead>
          <tbody>
            {m.lines.map((l: any, i: number) => {
              const b = Math.max(0, l.appr - l.iss);
              if (!b) return null;
              const st = rmBy[l.rm].onHand;
              const iq = Math.min(b, st);
              const sh = Math.max(0, b - (parseFloat(rows[i].q) || 0));
              return (
                <tr key={i}>
                  <td>{rmBy[l.rm].name}<div className="cell-sub">{rmBy[l.rm].bin}</div></td>
                  <td className="num">{qfmt(b)} {rmBy[l.rm].uom}</td>
                  <td className="num" style={st < b ? { color: "var(--bad)", fontWeight: 600 } : undefined}>{qfmt(st)}</td>
                  <td className="num"><QtyIn value={rows[i].q} max={iq} onChange={(v) => setQ(i, v)} /></td>
                  <td className="num">{qfmt(sh)}</td>
                  <td>
                    {l.ind ? <span className="small mono">{l.ind}</span> : (
                      <label className="small" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="checkbox" checked={rows[i].ind} onChange={(e) => setRows({ ...rows, [i]: { ...rows[i], ind: e.target.checked } })} style={{ width: 16, height: 16, accentColor: "var(--primary)" }} /> Indent
                      </label>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <RemarkBox label={`Message to ${USERS[m.by].name}`} ph="Required when sending back for clarification" value={note} onChange={setNote} err={err} />
    </Modal>
  );
}

function MrReplyModal({ id }: { id: string }) {
  const m = MRS.find((x: any) => x.id === id);
  const qn = m.history.filter((h: any) => h.act === "Clarification requested by stores").pop();
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const save = () => {
    if (!allow("mr")) return;
    if (!note.trim()) return setErr("Write your answer.");
    m.status = m.prevStatus || "Approved";
    logD(m, "Answered stores", note.trim(), "info");
    closeModal(); bump(); toast(`Answer sent; ${m.id} is back with stores`);
  };
  return (
    <Modal title={`Answer stores · ${m.id}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Send answer</button></>}>
      {qn && <div className="banner warn" style={{ display: "block" }}><b>Stores asked:</b> {qn.note}</div>}
      <Field id="mq-note" label="Your answer *" err={err}>
        <textarea className={`input ${err ? "invalid" : ""}`} id="mq-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}

