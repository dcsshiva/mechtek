// Purchase & stores documents: overview, vendors, indents, purchase orders, gate passes, GRN and vendor bills.
import { useState } from "react";
import {
  BILLS, COMPANY, DEBITS, DEPTS, GATES, GRNS, GSTIN_RE, INDENTS, MRS, PEND, POS, STATES, USERS, VENDORS,
  SESSION, SEQ, altHint, billBal, billCalc, billPaid, billPayable, billStatus, kgF, logD, nextId, pct, poLineStatus, poTotals,
  rmBy, roundQ, stateCode, staffBy, stockMove, taxCalc, uf, venBy, venRating, venTax,
} from "@/erp/engine";
import { TODAY, addDays, daysFrom, ds, fromIso, inWords, inr, inrShort, isoLocal, qfmt } from "@/erp/format";
import { UI, canApprove, canEdit, setUI } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { go, routeName } from "@/erp/nav";
import { DL, DocPill, ErrLine, Field, History, Modal, PageHead, Pill, SampleNote, Seg, closeModal, openModal, toast } from "../ui";
import {
  ApprovalBanner, LineEditor, PoQ, PoRate, QtyIn, RejQty, RemarkBox, RmCell, StatusSeg, UomSel, VenOptions,
  allow, edBase, edValid, fOf, numOf, refreshMrp, type Ed,
} from "./proc";

const mustGo = (r: string) => { closeModal(); go(r); };

/* ================= Approval decisions (indent, requisition, PO, gate pass, GRN) ================= */
export function decideDoc(type: string, id: string, v: "approve" | "reject", note: string, q: Record<string, string>): string | null {
  if (!canApprove(type)) { toast("Your role cannot approve this document.", true); return null; }
  if (type === "indent" || type === "mr") {
    const d = (type === "indent" ? INDENTS : MRS).find((x: any) => x.id === id);
    if (v === "reject") {
      if (!note) return "Give a reason for rejecting.";
      d.status = "Rejected"; d.lines.forEach((l: any) => (l.appr = 0)); logD(d, "Rejected", note, "bad");
    } else {
      const qs = d.lines.map((l: any, i: number) => Math.min(l.qty, Math.max(0, numOf(q["ap-q-" + i]))));
      if (qs.every((x: number) => x === 0)) return "All approved quantities are zero. Use Reject instead.";
      const partial = qs.some((x: number, i: number) => x < d.lines[i].qty);
      if (partial && !note) return "Explain the partial approval so the requester knows what changed.";
      d.lines.forEach((l: any, i: number) => (l.appr = qs[i]));
      d.status = partial ? "Partly approved" : "Approved";
      logD(d, partial ? "Partly approved" : "Approved", note, partial ? "warn" : "ok");
    }
    closeModal(); bump(); toast(`${d.id} ${d.status.toLowerCase()}`); return "";
  }
  if (type === "po" || type === "gate") {
    const d = (type === "po" ? POS : GATES).find((x: any) => x.id === id);
    if (v === "reject") {
      if (!note) return "Give a reason for rejecting.";
      d.status = "Rejected"; logD(d, "Rejected", note, "bad");
      if (type === "po" && d.indent) {
        const ind = INDENTS.find((x: any) => x.id === d.indent);
        if (ind) {
          d.lines.forEach((l: any) => { const il = ind.lines.find((x: any) => x.rm === l.rm); if (il) il.po = Math.max(0, il.po - l.qty); });
          ind.status = ind.lines.some((l: any) => l.po > 0) ? "Partly ordered" : ind.lines.some((l: any) => l.appr < l.qty) ? "Partly approved" : "Approved";
          logD(ind, "PO rejected", `${d.id} rejected; quantity is open again for ordering.`, "warn");
        }
      }
    } else {
      d.status = type === "po" ? "Approved" : d.returnable ? "Out, awaiting return" : "Gone out";
      logD(d, "Approved", note, "ok");
    }
    closeModal(); bump(); toast(`${d.id} ${v === "reject" ? "rejected" : "approved"}`); return "";
  }
  if (type === "grn") {
    const g = GRNS.find((x: any) => x.id === id);
    const acc = v === "reject" ? g.lines.map(() => 0) : g.lines.map((l: any, i: number) => Math.min(l.recv, Math.max(0, numOf(q["qc-a-" + i]))));
    const reasons = g.lines.map((_: any, i: number) => (q["qc-r-" + i] || "").trim());
    if (v === "reject" && !note) return "Give a reason for rejecting the whole receipt.";
    if (g.lines.some((l: any, i: number) => acc[i] < l.recv && !reasons[i] && !note)) return "Give a reason for the rejected quantity, on the line or here.";
    g.lines.forEach((l: any, i: number) => { l.acc = acc[i]; l.rej = l.recv - acc[i]; l.reason = l.rej ? reasons[i] || note : ""; });
    const totA = g.lines.reduce((s: number, l: any) => s + l.acc, 0), totR = g.lines.reduce((s: number, l: any) => s + l.rej, 0);
    g.status = totR === 0 ? "Accepted" : totA === 0 ? "Rejected" : "Partly accepted";
    logD(g, g.status, note, g.status === "Accepted" ? "ok" : g.status === "Rejected" ? "bad" : "warn");
    g.lines.forEach((l: any) => stockMove(l.rm, l.acc, "GRN receipt", g.id + " · " + g.po));
    const p = POS.find((x: any) => x.id === g.po);
    if (p) {
      g.lines.forEach((l: any) => {
        const pl = p.lines.find((x: any) => x.rm === l.rm);
        if (!pl) return;
        const byPc = l.cnt && l.recv > 0 && pl.ou && l.cu === pl.ou && pl.of !== 1;
        const cA = byPc ? (l.acc / l.recv) * l.cnt * pl.of : l.acc, cR = byPc ? (l.rej / l.recv) * l.cnt * pl.of : l.rej;
        pl.recv = Math.round((pl.recv + cA) * 1000) / 1000; pl.rej = Math.round((pl.rej + cR) * 1000) / 1000;
      });
      p.status = p.lines.every((l: any) => l.recv >= l.qty) ? "Received" : p.lines.some((l: any) => l.recv > 0) ? "Partly received" : p.status;
      logD(p, "Goods received", `${g.id}: ${qfmt(totA)} accepted${totR ? `, ${qfmt(totR)} rejected` : ""}.`, totR ? "warn" : "ok");
    }
    refreshMrp(); closeModal(); bump(); toast(`${g.id}: ${g.status}. Stock updated with accepted quantity.`); return "";
  }
  return null;
}

/** Approve / reject footer buttons shared by document modals. */
function DecideFoot({ onDecide, approveLabel = "Approve", rejectLabel = "Reject" }: { onDecide: (v: "approve" | "reject") => void; approveLabel?: string; rejectLabel?: string }) {
  return (
    <>
      <button className="btn" onClick={closeModal}>Cancel</button>
      <button className="btn" onClick={() => onDecide("reject")} style={{ color: "var(--bad)" }}>{rejectLabel}</button>
      <button className="btn primary" onClick={() => onDecide("approve")}>{approveLabel}</button>
    </>
  );
}

/* ================= Purchase overview ================= */
export function PurchasePage() {
  useErp();
  const k: [string, number, string][] = [
    ["Indents to approve", INDENTS.filter((d: any) => d.status === PEND).length, "indent"],
    ["Approved, not yet ordered", INDENTS.filter((d: any) => ["Approved", "Partly approved", "Partly ordered"].includes(d.status) && d.lines.some((l: any) => l.appr > l.po)).length, "indent"],
    ["POs to approve", POS.filter((p: any) => p.status === PEND).length, "po"],
    ["Open POs", POS.filter((p: any) => ["Approved", "Partly received"].includes(p.status)).length, "po"],
    ["Overdue deliveries", POS.filter((p: any) => ["Approved", "Partly received"].includes(p.status) && daysFrom(p.due) < 0).length, "po"],
    ["At gate, awaiting GRN", GATES.filter((g: any) => g.dir === "in" && g.status === "Awaiting GRN").length, "grn"],
    ["GRNs pending QC", GRNS.filter((g: any) => g.status === "Pending QC approval").length, "grn"],
    ["Vendor bills on hold", BILLS.filter((b: any) => b.status === PEND).length, "bills"],
  ];
  const lines = POS.filter((p: any) => p.status !== "Rejected")
    .flatMap((p: any) => p.lines.map((l: any) => ({ p, l, st: poLineStatus(p, l) })))
    .filter((x: any) => x.st.t !== "Received" && x.st.t !== "Short closed");
  return (
    <>
      <PageHead route="purchase" title="Purchase overview" desc="Where every purchase stands, from indent to vendor payment. Select a tile to open that list." />
      <div className="kpis">
        {k.map(([t, n, r]) => (
          <button key={t} className={`kpi ${n && /overdue|hold|approve/i.test(t) ? "warn" : ""}`} onClick={() => go(r)} style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}>
            <span className="k-label">{t}</span><span className="k-value">{n}</span><span className="k-foot">Open {routeName(r)[1]}</span>
          </button>
        ))}
      </div>
      <div className="flowline" aria-label="Purchase flow">
        <span className="box ap">Indent</span><span className="arr">→</span><span className="box ap">Purchase order</span><span className="arr">→</span>
        <span className="box">Gate entry: accept or reject at gate</span><span className="arr">→</span><span className="box ap">GRN: QC accept, part or reject</span><span className="arr">→</span>
        <span className="box">Stock</span><span className="arr">→</span><span className="box ap">Vendor bill: 3-way match</span><span className="arr">→</span><span className="box">Payment</span>
      </div>
      <section className="card">
        <div className="card-head"><h2>Open purchase order lines</h2><span className="small muted">{lines.length} lines not fully received</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>PO</th><th>Vendor</th><th>Material</th><th className="num">Ordered</th><th className="num">Accepted</th><th className="num">Rejected</th><th className="num">Balance</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {lines.map(({ p, l, st }: any, i: number) => (
                <tr key={p.id + i} className="clickable" onClick={() => openModal(<PoDetail id={p.id} />)}>
                  <td className="mono cell-title nowrap">{p.id}</td><td>{venBy(p.vendor).name}</td><td>{rmBy[l.rm].name}</td>
                  <td className="num"><PoQ l={l} /></td><td className="num">{qfmt(l.recv)}</td><td className="num"><RejQty q={l.rej} /></td>
                  <td className="num">{qfmt(Math.max(0, l.qty - l.recv))}</td><td className="nowrap">{ds(p.due)}</td><td><Pill t={st.t} c={st.c} /></td>
                </tr>
              ))}
              {!lines.length && <tr><td colSpan={9} className="empty">Every PO line is received.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h2>Vendor performance</h2><span className="small muted">From gate entries and QC results</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Vendor</th><th>Supplies</th><th className="num">Deliveries</th><th className="num">On time</th><th className="num">QC accepted</th><th className="num">Payable</th></tr></thead>
            <tbody>
              {VENDORS.map((v: any) => {
                const r = venRating(v.id);
                const pay = BILLS.filter((b: any) => b.vendor === v.id).reduce((s: number, b: any) => s + billBal(b), 0);
                return (
                  <tr key={v.id}>
                    <td className="cell-title">{v.name}<div className="cell-sub" style={{ fontWeight: 400 }}>{v.city}</div></td>
                    <td className="small muted">{v.supplies}</td><td className="num">{r.n}</td><td className="num">{pct(r.ontime)}</td>
                    <td className="num" style={r.acc != null && r.acc < 98 ? { color: "var(--warn)", fontWeight: 600 } : undefined}>{pct(r.acc)}</td>
                    <td className="num">{pay ? inr(pay) : "—"}</td>
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

/* ================= Vendors ================= */
export function VendorsPage() {
  useErp();
  return (
    <>
      <PageHead route="vendors" title="Vendors" desc="Suppliers and job-work partners with GST details, payment terms and performance."
        actions={[<button key="n" className="btn primary" onClick={() => allow("vendors") && openModal(<VenModal />)}>Add vendor</button>]} />
      <SampleNote>Vendor names and GSTINs are fictional, for demonstration only.</SampleNote>
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Code</th><th>Vendor</th><th>Location · GST</th><th>Supplies</th><th className="num">Terms</th><th className="num">On time</th><th className="num">QC accepted</th><th></th></tr></thead>
            <tbody>
              {VENDORS.map((v: any) => {
                const r = venRating(v.id);
                return (
                  <tr key={v.id}>
                    <td className="mono">{v.id}</td>
                    <td className="cell-title">{v.name}<div className="cell-sub" style={{ fontWeight: 400 }}>{v.contact || ""} · +91 {v.phone || ""}</div></td>
                    <td>{v.city}, {v.state || ""}<div className="cell-sub mono">{v.gstin || "GSTIN missing"} · {venTax(v) === "intra" ? "CGST+SGST" : "IGST"}</div></td>
                    <td className="small">{v.supplies}</td><td className="num">{v.terms || 30} days</td><td className="num">{pct(r.ontime)}</td><td className="num">{pct(r.acc)}</td>
                    <td>{canEdit("vendors") && <button className="btn sm" onClick={() => openModal(<VenModal id={v.id} />)}>Edit</button>}</td>
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

function VenModal({ id }: { id?: string }) {
  const v = id ? venBy(id) : null;
  const [f, setF] = useState({
    name: v?.name || "", city: v?.city || "", state: v?.state || STATES[0][0], gstin: v?.gstin || "", terms: String(v ? v.terms || 30 : 30),
    contact: v?.contact || "", phone: v?.phone || "", supplies: v?.supplies || "",
  });
  const [e, setE] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (x: any) => setF({ ...f, [k]: x.target.value });
  const save = () => {
    if (!allow("vendors")) return;
    const name = f.name.trim(), city = f.city.trim(), gstin = f.gstin.trim().toUpperCase(), phone = f.phone.trim();
    const errs: Record<string, string> = {};
    if (!name) errs.name = "Enter the vendor name.";
    if (!city) errs.city = "Enter the city.";
    const ge = !GSTIN_RE.test(gstin) ? "Enter a valid 15-character GSTIN." : gstin.slice(0, 2) !== stateCode(f.state) ? `GSTIN starts with ${gstin.slice(0, 2)} but ${f.state} is ${stateCode(f.state)}.` : VENDORS.some((x: any) => x.gstin === gstin && x !== v) ? "Another vendor has this GSTIN." : "";
    if (ge) errs.gstin = ge;
    if (phone && !/^\d{10}$/.test(phone.replace(/\s/g, ""))) errs.phone = "Enter a 10-digit mobile number.";
    setE(errs);
    if (Object.keys(errs).length) return;
    const data = { name, city, state: f.state, gstin, terms: Math.max(0, parseInt(f.terms) || 30), contact: f.contact.trim(), phone, supplies: f.supplies.trim() || "—" };
    if (v) Object.assign(v, data);
    else VENDORS.push({ id: "V" + String(SEQ.ven++).padStart(2, "0"), ...data, active: true });
    closeModal(); bump(); toast(v ? `${name} updated` : `${name} added`);
  };
  const inp = (k: keyof typeof f, label: string, extra: any = {}, span?: boolean) => (
    <Field id={"vn-" + k} label={label} err={e[k]} span={span}>
      <input className={`input ${e[k] ? "invalid" : ""} ${extra.mono ? "mono" : ""}`} id={"vn-" + k} value={f[k]} onChange={set(k)} placeholder={extra.ph} />
    </Field>
  );
  return (
    <Modal wide title={v ? `Edit vendor · ${v.name}` : "Add vendor"}
      foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>{v ? "Save vendor" : "Add vendor"}</button></>}>
      <div className="form-grid">
        {inp("name", "Vendor name *", {}, true)}
        {inp("city", "City *")}
        <Field id="vn-state" label="State *">
          <select className="input" id="vn-state" value={f.state} onChange={set("state")}>
            {STATES.map((s: any) => <option key={s[0]} value={s[0]}>{s[0]} ({s[1]})</option>)}
          </select>
        </Field>
        {inp("gstin", "GSTIN *", { mono: true })}
        <Field id="vn-terms" label="Payment terms (days)">
          <input className="input num" id="vn-terms" type="number" min={0} value={f.terms} onChange={set("terms")} />
        </Field>
        {inp("contact", "Contact person")}
        {inp("phone", "Mobile")}
        {inp("supplies", "Supplies", { ph: "e.g. SS sheet, bar stock" }, true)}
      </div>
    </Modal>
  );
}

/* ================= Indents ================= */
export function IndentPage() {
  useErp();
  return (
    <>
      <PageHead route="indent" title="Indents" desc="Departments request materials here. An approver can approve all, approve part of the quantity, or reject. Approved quantities go to purchase orders."
        actions={[<button key="n" className="btn primary" onClick={() => openIndent()}>New indent</button>]} />
      <ApprovalBanner t="indent" items={INDENTS} label="indent" />
      <StatusSeg k="indent" items={INDENTS} order={["all", PEND, "Approved", "Partly approved", "Partly ordered", "Ordered", "Rejected"]} />
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Indent</th><th>Raised by</th><th>Materials</th><th className="num">Requested</th><th className="num">Approved</th><th>Need by</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {fOf("indent", INDENTS).slice().reverse().map((d: any) => {
                const mine = canApprove("indent") && d.status === PEND;
                const open = () => openModal(<IndentDetail id={d.id} />);
                return (
                  <tr key={d.id} className="clickable" onClick={open}>
                    <td className="nowrap"><div className="cell-title mono">{d.id}</div><div className="cell-sub">{ds(d.date)} · {d.source}</div></td>
                    <td>{USERS[d.by].name}<div className="cell-sub">{d.dept}</div></td>
                    <td style={{ minWidth: 200 }}>{d.lines.map((l: any, i: number) => <div key={i}>{rmBy[l.rm].name}</div>)}</td>
                    <td className="num">{d.lines.map((l: any, i: number) => <div key={i}>{qfmt(l.qty)} {rmBy[l.rm].uom}</div>)}</td>
                    <td className="num">{d.lines.map((l: any, i: number) => <div key={i}>{d.status === PEND ? "—" : qfmt(l.appr)}</div>)}</td>
                    <td className="nowrap">{ds(d.needBy)}</td><td><DocPill st={d.status} /></td>
                    <td><button className={`btn sm ${mine ? "primary" : ""}`} onClick={(e) => { e.stopPropagation(); open(); }}>{mine ? "Review" : "Open"}</button></td>
                  </tr>
                );
              })}
              {!fOf("indent", INDENTS).length && <tr><td colSpan={8} className="empty">No indents with this status.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function openIndent(pre?: any) {
  if (!allow("indent")) return;
  openModal(<NewIndentModal pre={pre} />);
}

function NewIndentModal({ pre }: { pre?: any }) {
  const [ed, setEd] = useState<Ed>({ grp: false, uom: true, lines: (pre && pre.lines) || [{ rm: "", qty: "" }] });
  const [dept, setDept] = useState((pre && pre.dept) || (staffBy(SESSION.user) || {}).dept || DEPTS[0]);
  const [need, setNeed] = useState(pre?.needBy || isoLocal(addDays(TODAY, 10)));
  const [reason, setReason] = useState((pre && pre.reason) || "");
  const [e, setE] = useState<Record<string, string>>({});
  const save = () => {
    if (!allow("indent")) return;
    const r = reason.trim(), err = edValid(ed);
    setE({ reason: r ? "" : "Enter a reason.", ed: err });
    if (!r || err) return;
    const d: any = {
      id: nextId("IND"), date: new Date(TODAY), by: SESSION.user, dept, source: (pre && pre.source) || "Manual", needBy: fromIso(need), reason: r, status: PEND,
      lines: edBase(ed).map((l) => ({ rm: l.rm, qty: l.qty, appr: l.qty, po: 0 })), history: [],
    };
    logD(d, "Submitted for approval", "", "info");
    INDENTS.push(d);
    UI.f.indent = "all";
    refreshMrp(); mustGo("indent"); bump(); toast(`${d.id} submitted for approval`);
  };
  return (
    <Modal wide title="New indent" foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Submit for approval</button></>}>
      <div className="form-grid">
        <Field id="in-dept" label="Department">
          <select className="input" id="in-dept" value={dept} onChange={(x) => setDept(x.target.value)}>{DEPTS.map((d: string) => <option key={d}>{d}</option>)}</select>
        </Field>
        <Field id="in-need" label="Needed by"><input className="input" id="in-need" type="date" value={need} onChange={(x) => setNeed(x.target.value)} /></Field>
        <Field id="in-reason" label="Reason *" err={e.reason} span>
          <input className={`input ${e.reason ? "invalid" : ""}`} id="in-reason" value={reason} onChange={(x) => setReason(x.target.value)} placeholder="What is it for? Order or work order reference" />
        </Field>
      </div>
      <LineEditor ed={ed} onChange={setEd} />
      <ErrLine msg={e.ed} />
    </Modal>
  );
}

export function IndentDetail({ id }: { id: string }) {
  const d = INDENTS.find((x: any) => x.id === id);
  const ap = d.status === PEND && canApprove("indent");
  const bal = d.lines.reduce((s: number, l: any) => s + Math.max(0, l.appr - l.po), 0);
  const [q, setQ] = useState<Record<string, string>>(() => Object.fromEntries(d.lines.map((l: any, i: number) => ["ap-q-" + i, String(l.qty)])));
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const decide = (v: "approve" | "reject") => { const r = decideDoc("indent", d.id, v, note.trim(), q); if (r) setErr(r); };
  let foot = <button className="btn" onClick={closeModal}>Close</button>;
  if (ap) foot = <DecideFoot onDecide={decide} />;
  else if (bal > 0 && d.status !== "Rejected" && canEdit("po"))
    foot = <><button className="btn" onClick={closeModal}>Close</button><button className="btn primary" onClick={() => allow("po") && openModal(<NewPoModal indId={d.id} />)}>Create purchase order</button></>;
  return (
    <Modal wide title={`Indent ${d.id}`} foot={foot}>
      <DL pairs={[["Raised by", `${USERS[d.by].name} · ${d.dept}`], ["Date", ds(d.date)], ["Needed by", ds(d.needBy)], ["Source", d.source], ["Status", <DocPill st={d.status} />]]} />
      <p><b>Reason:</b> {d.reason}</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">In stock</th><th className="num">Requested</th><th className="num">Approved</th><th className="num">On PO</th></tr></thead>
          <tbody>
            {d.lines.map((l: any, i: number) => (
              <tr key={i}>
                <td><RmCell code={l.rm} /></td><td className="num">{qfmt(rmBy[l.rm].onHand)}</td><td className="num">{qfmt(l.qty)} {rmBy[l.rm].uom}</td>
                <td className="num">{ap ? <QtyIn value={q["ap-q-" + i]} max={l.qty} onChange={(v) => setQ({ ...q, ["ap-q-" + i]: v })} /> : d.status === PEND ? "—" : qfmt(l.appr)}</td>
                <td className="num">{qfmt(l.po)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ap && (
        <div className="approval-box">
          <h3 style={{ fontSize: 14 }}>Your decision</h3>
          <p className="small muted">Lower an approved quantity to approve part of a line; set it to 0 to drop the line. A remark is required for a partial approval or a rejection.</p>
          <RemarkBox label={`Remarks to ${USERS[d.by].name}`} value={note} onChange={setNote} err={err} />
        </div>
      )}
      <History items={d.history} />
    </Modal>
  );
}

/* ================= Purchase orders ================= */
const toOrderIndents = () => INDENTS.filter((d: any) => ["Approved", "Partly approved", "Partly ordered"].includes(d.status) && d.lines.some((l: any) => l.appr > l.po));

export function PoPage() {
  useErp();
  const toOrder = toOrderIndents();
  const list = fOf("po", POS).slice().reverse();
  return (
    <>
      <PageHead route="po" title="Purchase orders" desc="Orders to vendors, from approved indents or raised directly for urgent needs. Each PO is approved before it goes out and can be received in parts."
        actions={[
          ...(toOrder.length ? [<button key="i" className="btn" onClick={() => allow("po") && openModal(<PoPick />)}>PO from indent</button>] : []),
          <button key="d" className="btn primary" onClick={() => allow("po") && openModal(<DirectPoModal />)}>New direct PO</button>,
        ]} />
      <ApprovalBanner t="po" items={POS} label="purchase order" />
      {canEdit("po") && toOrder.length > 0 && (
        <div className="banner warn">
          <span><b>{toOrder.length} approved indent{toOrder.length > 1 ? "s" : ""} still to be ordered:</b> {toOrder.map((d: any) => d.id).join(", ")}</span>
          <button className="btn sm" onClick={() => openModal(<PoPick />)}>Create PO</button>
        </div>
      )}
      <StatusSeg k="po" items={POS} order={["all", PEND, "Approved", "Partly received", "Received", "Short closed", "Rejected"]} />
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>PO</th><th>Vendor</th><th>Materials</th><th className="num">Ordered</th><th className="num">Accepted</th><th className="num">Value incl. GST</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((p: any) => {
                const mine = canApprove("po") && p.status === PEND;
                const t = poTotals(p);
                const open = () => openModal(<PoDetail id={p.id} />);
                return (
                  <tr key={p.id} className="clickable" onClick={open}>
                    <td className="nowrap"><div className="cell-title mono">{p.id}</div><div className="cell-sub">{ds(p.date)} · {p.indent || "Direct"}</div></td>
                    <td>{venBy(p.vendor).name}<div className="cell-sub">{venBy(p.vendor).city}</div></td>
                    <td style={{ minWidth: 190 }}>{p.lines.map((l: any, i: number) => <div key={i}>{rmBy[l.rm].name}</div>)}</td>
                    <td className="num">{p.lines.map((l: any, i: number) => <div key={i}>{qfmt(l.qty)} {rmBy[l.rm].uom}</div>)}</td>
                    <td className="num">{p.lines.map((l: any, i: number) => <div key={i}>{qfmt(l.recv)}{l.rej ? <span className="small" style={{ color: "var(--bad)" }}> ({qfmt(l.rej)} rej.)</span> : null}</div>)}</td>
                    <td className="num">{inr(t.total)}</td>
                    <td className="nowrap">{ds(p.due)}{["Approved", "Partly received"].includes(p.status) && daysFrom(p.due) < 0 && <div className="cell-sub" style={{ color: "var(--bad)" }}>{-daysFrom(p.due)} days late</div>}</td>
                    <td><DocPill st={p.status} /></td>
                    <td><button className={`btn sm ${mine ? "primary" : ""}`} onClick={(e) => { e.stopPropagation(); open(); }}>{mine ? "Review" : "Open"}</button></td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={9} className="empty">No purchase orders with this status.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function PoPick() {
  const list = toOrderIndents();
  const [sel, setSel] = useState(list[0]?.id || "");
  return (
    <Modal title="New purchase order" foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={() => sel && openModal(<NewPoModal indId={sel} />)}>Continue</button></>}>
      <Field id="po-ind" label="Approved indent">
        <select className="input" id="po-ind" value={sel} onChange={(e) => setSel(e.target.value)}>
          {list.map((d: any) => <option key={d.id} value={d.id}>{d.id} · {d.reason}</option>)}
        </select>
      </Field>
    </Modal>
  );
}

/** PO from an approved indent, with order unit conversion. */
export function NewPoModal({ indId }: { indId: string }) {
  const d = INDENTS.find((x: any) => x.id === indId);
  const ls = d.lines.map((l: any, i: number) => ({ ...l, i, bal: Math.max(0, l.appr - l.po) })).filter((l: any) => l.bal > 0);
  const [ven, setVen] = useState(ls[0] ? rmBy[ls[0].rm].vendor : "V02");
  const [due, setDue] = useState(isoLocal(d.needBy > TODAY ? d.needBy : addDays(TODAY, 10)));
  const [rows, setRows] = useState<Record<number, { u: string; q: string; r: string }>>(() =>
    Object.fromEntries(ls.map((l: any) => [l.i, { u: rmBy[l.rm].uom, q: String(l.bal), r: String(rmBy[l.rm].rate) }])),
  );
  const [err, setErr] = useState("");
  const setRow = (i: number, patch: Partial<{ u: string; q: string; r: string }>) => setRows({ ...rows, [i]: { ...rows[i], ...patch } });
  const unitChanged = (l: any, u: string) => {
    const f = uf(l.rm, u);
    setRow(l.i, { u, q: String(roundQ(l.rm, u, l.bal / f)), r: String(Math.round(rmBy[l.rm].rate * f * 100) / 100) });
  };
  const save = () => {
    if (!allow("po")) return;
    const lines: any[] = [];
    let bad = "";
    d.lines.forEach((l: any, i: number) => {
      const row = rows[i];
      if (!row) return;
      const f = uf(l.rm, row.u), q = numOf(row.q), r = numOf(row.r), bal = l.appr - l.po, base = q * f;
      if (base > bal + f - 1e-6) bad = `${rmBy[l.rm].name}: order quantity is more than the approved balance (beyond one ${row.u}).`;
      if (q > 0) {
        if (!(r > 0)) bad = "Enter a rate for every line you order.";
        lines.push({ rm: l.rm, qty: Math.round(base * 1000) / 1000, rate: r / f, ou: row.u, of: f, oq: q, orate: r, recv: 0, rej: 0, i, toInd: Math.min(base, bal) });
      }
    });
    if (!lines.length) bad = bad || "Enter a quantity on at least one line.";
    if (bad) return setErr(bad);
    const p: any = { id: nextId("PO"), date: new Date(TODAY), vendor: ven, indent: d.id, due: fromIso(due), status: PEND, lines: lines.map(({ i, toInd, ...x }) => x), history: [] };
    lines.forEach((x) => (d.lines[x.i].po += x.toInd));
    d.status = d.lines.every((l: any) => l.po >= l.appr - 1e-6) ? "Ordered" : "Partly ordered";
    logD(d, "Purchase order created", p.id, "");
    const conv = lines.filter((x) => x.of !== 1);
    logD(p, "Created and submitted", `From ${d.id}.${conv.length ? " Ordered in " + conv.map((x) => `${qfmt(x.oq)} × ${x.ou}`).join(", ") + "." : ""}`, "info");
    POS.push(p);
    mustGo("po"); bump(); toast(`${p.id} submitted for approval`);
  };
  return (
    <Modal wide title={`Purchase order from ${d.id}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Submit PO for approval</button></>}>
      <div className="form-grid">
        <Field id="po-ven" label="Vendor"><select className="input" id="po-ven" value={ven} onChange={(e) => setVen(e.target.value)}><VenOptions /></select></Field>
        <Field id="po-due" label="Delivery due"><input className="input" id="po-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      </div>
      <p className="small muted">Choose the unit the vendor sells in (for example sheets, blocks or lengths). Quantity and rate convert automatically; stock is always kept in the base unit.</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">Approved balance</th><th>Order unit</th><th className="num">Order qty</th><th className="num">Rate per unit (₹)</th><th className="num">In base unit</th></tr></thead>
          <tbody>
            {ls.map((l: any) => {
              const row = rows[l.i];
              const b = numOf(row.q) * uf(l.rm, row.u);
              return (
                <tr key={l.i}>
                  <td><RmCell code={l.rm} /></td>
                  <td className="num">{qfmt(l.bal)} {rmBy[l.rm].uom}<div className="cell-sub">{altHint(l.rm, l.bal)}</div></td>
                  <td style={{ minWidth: 150 }}><UomSel code={l.rm} value={row.u} onChange={(u) => unitChanged(l, u)} /></td>
                  <td className="num"><QtyIn value={row.q} onChange={(v) => setRow(l.i, { q: v })} /></td>
                  <td className="num"><QtyIn value={row.r} onChange={(v) => setRow(l.i, { r: v })} /></td>
                  <td className="num">{qfmt(Math.round(b * 100) / 100)} {rmBy[l.rm].uom}</td>
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

function DirectPoModal() {
  const [ed, setEd] = useState<Ed>({ grp: false, uom: true, lines: [{ rm: "", qty: "" }] });
  const [ven, setVen] = useState("V01");
  const [due, setDue] = useState(isoLocal(addDays(TODAY, 7)));
  const [reason, setReason] = useState("");
  const [e, setE] = useState<Record<string, string>>({});
  const save = () => {
    if (!allow("po")) return;
    const r = reason.trim(), err = edValid(ed);
    setE({ reason: r ? "" : "Give the reason for buying without an indent.", ed: err });
    if (!r || err) return;
    const p: any = {
      id: nextId("PO"), date: new Date(TODAY), vendor: ven, indent: null, reason: r, due: fromIso(due), status: PEND,
      lines: edBase(ed).map((l) => {
        const f = uf(l.rm, l.eu);
        return { rm: l.rm, qty: l.qty, rate: rmBy[l.rm].rate, ou: l.eu, of: f, oq: l.eq, orate: Math.round(rmBy[l.rm].rate * f * 100) / 100, recv: 0, rej: 0 };
      }),
      history: [],
    };
    logD(p, "Created and submitted", `Direct PO: ${r}`, "info");
    POS.push(p);
    UI.f.po = "all";
    mustGo("po"); bump(); toast(`${p.id} submitted for approval`);
  };
  return (
    <Modal wide title="New direct purchase order" foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Submit PO for approval</button></>}>
      <div className="form-grid">
        <Field id="dp-ven" label="Vendor"><select className="input" id="dp-ven" value={ven} onChange={(x) => setVen(x.target.value)}><VenOptions /></select></Field>
        <Field id="dp-due" label="Delivery due"><input className="input" id="dp-due" type="date" value={due} onChange={(x) => setDue(x.target.value)} /></Field>
        <Field id="dp-reason" label="Reason for direct purchase *" err={e.reason} span>
          <input className={`input ${e.reason ? "invalid" : ""}`} id="dp-reason" value={reason} onChange={(x) => setReason(x.target.value)} placeholder="e.g. Breakdown spare for EB-160 at Sunrise; no time for an indent" />
        </Field>
      </div>
      <p className="small muted">Direct POs skip the indent and use the rate from the raw material master. They still need PO approval.</p>
      <LineEditor ed={ed} onChange={setEd} />
      <ErrLine msg={e.ed} />
    </Modal>
  );
}

export function PoDetail({ id }: { id: string }) {
  const p = POS.find((x: any) => x.id === id);
  const ap = p.status === PEND && canApprove("po");
  const open = ["Approved", "Partly received"].includes(p.status);
  const bal = p.lines.reduce((s: number, l: any) => s + Math.max(0, l.qty - l.recv), 0);
  const t = poTotals(p);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const decide = (v: "approve" | "reject") => { const r = decideDoc("po", p.id, v, note.trim(), {}); if (r) setErr(r); };
  const shortClose = () => {
    if (!allow("po")) return;
    if (!note.trim()) return setErr("Give a reason for short-closing.");
    p.status = "Short closed"; logD(p, "Short-closed balance", note.trim(), "");
    closeModal(); bump(); toast(`${p.id} short-closed`);
  };
  const docBtn = <button className="btn" onClick={() => openModal(<PoDocModal id={p.id} />)}>View PO document</button>;
  let foot = <><button className="btn" onClick={closeModal}>Close</button>{docBtn}</>;
  let box = null;
  if (ap) {
    box = <div className="approval-box"><h3 style={{ fontSize: 14 }}>Your decision</h3><RemarkBox label="Remarks" ph="Required when rejecting" value={note} onChange={setNote} err={err} /></div>;
    foot = <><button className="btn" onClick={closeModal}>Cancel</button>{docBtn}<button className="btn" onClick={() => decide("reject")} style={{ color: "var(--bad)" }}>Reject</button><button className="btn primary" onClick={() => decide("approve")}>Approve</button></>;
  } else if (open && bal > 0) {
    if (canEdit("po")) box = <div className="approval-box"><RemarkBox label="Remarks (required to short-close)" ph="For example: vendor cannot supply the balance" value={note} onChange={setNote} err={err} /></div>;
    foot = (
      <>
        <button className="btn" onClick={closeModal}>Close</button>{docBtn}
        {canEdit("po") && <button className="btn" onClick={shortClose}>Short-close balance</button>}
        {canEdit("gate") && <button className="btn primary" onClick={() => openModal(<GateInModal poId={p.id} />)}>Record gate entry</button>}
      </>
    );
  }
  return (
    <Modal wide title={`Purchase order ${p.id}`} foot={foot}>
      <DL pairs={[
        ["Vendor", `${venBy(p.vendor).name}, ${venBy(p.vendor).city}`],
        ["Source", p.indent ? <>Indent <span className="mono">{p.indent}</span></> : "Direct PO"],
        ["PO date", ds(p.date)], ["Delivery due", ds(p.due)], ["Value incl. GST", inr(t.total)], ["Status", <DocPill st={p.status} />],
      ]} />
      {p.reason && <p><b>Reason:</b> {p.reason}</p>}
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">Ordered</th><th className="num">Rate</th><th className="num">Accepted</th><th className="num">Rejected</th><th className="num">Balance</th><th>Line status</th></tr></thead>
          <tbody>
            {p.lines.map((l: any, i: number) => {
              const st = poLineStatus(p, l);
              return (
                <tr key={i}>
                  <td><RmCell code={l.rm} /></td><td className="num"><PoQ l={l} /></td><td className="num"><PoRate l={l} /></td><td className="num">{qfmt(l.recv)}</td>
                  <td className="num"><RejQty q={l.rej} /></td><td className="num">{qfmt(Math.max(0, l.qty - l.recv))}</td><td><Pill t={st.t} c={st.c} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted">Rejected quantity (at the gate or by QC) stays in the balance so the vendor can replace it, unless the PO is short-closed.</p>
      {box}
      <History items={p.history} />
    </Modal>
  );
}

function PoDocModal({ id }: { id: string }) {
  const p = POS.find((x: any) => x.id === id);
  const v = venBy(p.vendor);
  const t = poTotals(p);
  const appr = p.history.find((h: any) => h.act === "Approved");
  return (
    <Modal wide title={`Purchase order document ${p.id}`}
      foot={<><button className="btn" onClick={() => openModal(<PoDetail id={p.id} />)}>Back to PO</button><button className="btn primary" onClick={closeModal}>Close</button></>}>
      <div className="inv-doc">
        <div className="inv-head">
          <div><div className="inv-title">PURCHASE ORDER</div><div className="small muted">Sample document</div></div>
          <div style={{ textAlign: "right" }}><div className="mono cell-title">{p.id}</div><div className="small">Date {ds(p.date)}</div><DocPill st={p.status} /></div>
        </div>
        <div className="inv-parties">
          <div><div className="inv-lbl">Buyer</div><b>{COMPANY.name}</b><div className="small">{COMPANY.addr}</div><div className="small mono">GSTIN {COMPANY.gstin}</div></div>
          <div><div className="inv-lbl">Vendor</div><b>{v.name}</b><div className="small">{v.city}, {v.state || ""}</div><div className="small mono">GSTIN {v.gstin || "—"}</div><div className="small">{v.contact || ""} · +91 {v.phone || ""}</div></div>
          <div>
            <div className="inv-lbl">Terms</div><div className="small">Deliver by {ds(p.due)} to our Bengaluru works</div>
            <div className="small">Payment: {v.terms || 30} days from receipt of accepted material and invoice</div>
            <div className="small">{p.indent ? "Against indent " + p.indent : "Direct purchase"}</div><div className="small">Quote this PO number on your invoice and delivery challan</div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>#</th><th>Material</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {p.lines.map((l: any, i: number) => (
                <tr key={i}><td>{i + 1}</td><td><RmCell code={l.rm} /></td><td className="num"><PoQ l={l} /></td><td className="num"><PoRate l={l} /></td><td className="num">{inr(l.qty * l.rate)}</td></tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4}>Taxable value</td><td className="num">{inr(t.taxable)}</td></tr>
              {t.sup === "intra" ? (
                <><tr><td colSpan={4}>CGST @ 9%</td><td className="num">{inr(t.cgst)}</td></tr><tr><td colSpan={4}>SGST @ 9%</td><td className="num">{inr(t.sgst)}</td></tr></>
              ) : (
                <tr><td colSpan={4}>IGST @ 18%</td><td className="num">{inr(t.igst)}</td></tr>
              )}
              <tr><td colSpan={4}><b>PO total</b></td><td className="num"><b>{inr(t.total)}</b></td></tr>
            </tfoot>
          </table>
        </div>
        <p className="small"><b>Amount in words:</b> Rupees {inWords(t.total)} only</p>
        <div className="small muted">Material is subject to our inspection. Rejected material will be returned at the vendor's cost and must be replaced or credited by debit note.</div>
        <div className="inv-sign">
          <span className="small muted">{appr ? `Approved by ${USERS[appr.by].name} on ${ds(appr.at)}` : "Not yet approved: do not send to vendor"}</span>
          <span className="small">for <b>{COMPANY.name}</b><br /><br />Authorised signatory</span>
        </div>
      </div>
    </Modal>
  );
}

/* ================= Gate pass ================= */
const openPos = () => POS.filter((p: any) => ["Approved", "Partly received"].includes(p.status) && p.lines.some((l: any) => l.qty - l.recv > 0));

export function GatePage() {
  useErp();
  const tab = UI.gateTab || "in";
  const list = GATES.filter((g: any) => g.dir === tab).slice().reverse();
  return (
    <>
      <PageHead route="gate" title="Gate pass" desc="Inward entries record what arrives at the gate against a PO. Outward passes let material leave: returns to vendors and job work, with approval."
        actions={tab === "in"
          ? openPos().length ? [<button key="i" className="btn primary" onClick={() => allow("gate") && openModal(<GateInPick />)}>New inward entry</button>] : undefined
          : [<button key="o" className="btn primary" onClick={() => openGp()}>New outward gate pass</button>]} />
      <ApprovalBanner t="gate" items={GATES.filter((g: any) => g.dir === "out")} label="outward gate pass" />
      <div className="toolbar">
        <Seg label="Direction" value={tab} onChange={(v) => setUI({ gateTab: v })}
          options={[["in", `Inward (GRN) (${GATES.filter((g: any) => g.dir === "in").length})`], ["out", `Outward (returns, job work) (${GATES.filter((g: any) => g.dir === "out").length})`]]} />
      </div>
      {tab === "in" ? (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Entry</th><th>Vendor · PO</th><th>Vehicle · DC / invoice</th><th>Materials arrived</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.map((g: any) => (
                  <tr key={g.id} className="clickable" onClick={() => openModal(<GateDetail id={g.id} />)}>
                    <td className="nowrap"><div className="cell-title mono">{g.id}</div><div className="cell-sub">{ds(g.date)}</div></td>
                    <td>{venBy(g.party).name}<div className="cell-sub mono">{g.po}</div></td>
                    <td className="nowrap">{g.vehicle}<div className="cell-sub">{g.dc}</div></td>
                    <td style={{ minWidth: 200 }}>
                      {g.lines.map((l: any, i: number) => (
                        <div key={i}>{l.ru && l.ru !== rmBy[l.rm].uom ? `${qfmt(l.rq)} × ${l.ru} (${qfmt(l.qty)} ${rmBy[l.rm].uom})` : qfmt(l.qty) + " " + rmBy[l.rm].uom} · {rmBy[l.rm].name}</div>
                      ))}
                    </td>
                    <td><DocPill st={g.status} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {g.status === "Awaiting GRN" && canEdit("grn")
                        ? <button className="btn sm primary" onClick={() => openModal(<NewGrnModal gateId={g.id} />)}>Create GRN</button>
                        : <button className="btn sm" onClick={() => openModal(<GateDetail id={g.id} />)}>Open</button>}
                    </td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={6} className="empty">No inward entries.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Gate pass</th><th>Party</th><th>Purpose</th><th>Materials</th><th>Return</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.map((g: any) => {
                  const mine = canApprove("gate") && g.status === PEND;
                  return (
                    <tr key={g.id} className="clickable" onClick={() => openModal(<GateDetail id={g.id} />)}>
                      <td className="nowrap"><div className="cell-title mono">{g.id}</div><div className="cell-sub">{ds(g.date)}</div></td>
                      <td>{venBy(g.party).name}</td>
                      <td>{g.purpose}{g.ref && <div className="cell-sub mono">{g.ref}</div>}</td>
                      <td style={{ minWidth: 190 }}>
                        {g.lines.map((l: any, i: number) => (
                          <div key={i}>{qfmt(l.qty)} {rmBy[l.rm].uom} · {rmBy[l.rm].name}{g.returnable && <span className="small muted"> ({qfmt(l.back)} back)</span>}</div>
                        ))}
                      </td>
                      <td className="nowrap">{g.returnable ? <>Returnable<div className="cell-sub">by {ds(g.expBack)}</div></> : "Non-returnable"}</td>
                      <td><DocPill st={g.status} /></td>
                      <td><button className={`btn sm ${mine ? "primary" : ""}`}>{mine ? "Review" : "Open"}</button></td>
                    </tr>
                  );
                })}
                {!list.length && <tr><td colSpan={7} className="empty">No outward gate passes.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function GateInPick() {
  const list = openPos();
  const [sel, setSel] = useState(list[0]?.id || "");
  return (
    <Modal title="New inward entry" foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={() => sel && openModal(<GateInModal poId={sel} />)}>Continue</button></>}>
      <Field id="gi-po" label="Purchase order">
        <select className="input" id="gi-po" value={sel} onChange={(e) => setSel(e.target.value)}>
          {list.map((p: any) => <option key={p.id} value={p.id}>{p.id} · {venBy(p.vendor).name}</option>)}
        </select>
      </Field>
    </Modal>
  );
}

function GateInModal({ poId }: { poId: string }) {
  const p = POS.find((x: any) => x.id === poId);
  const ls = p.lines.map((l: any, i: number) => ({ ...l, i, bal: Math.max(0, l.qty - l.recv) })).filter((l: any) => l.bal > 0);
  const [veh, setVeh] = useState("");
  const [dc, setDc] = useState("");
  const [rows, setRows] = useState<Record<number, { u: string; q: string; r: string; rs: string }>>(() =>
    Object.fromEntries(ls.map((l: any) => { const u = l.ou || rmBy[l.rm].uom; return [l.i, { u, q: String(roundQ(l.rm, u, l.bal / uf(l.rm, u))), r: "0", rs: "" }]; })),
  );
  const [e, setE] = useState<Record<string, string>>({});
  const setRow = (i: number, patch: any) => setRows({ ...rows, [i]: { ...rows[i], ...patch } });
  const save = () => {
    if (!allow("gate")) return;
    const errs: Record<string, string> = {};
    const v = veh.trim(), d = dc.trim();
    if (!v) errs.veh = "Enter the vehicle number.";
    if (!d) errs.dc = "Enter the DC or invoice number.";
    const lines: any[] = [];
    let bad = "";
    p.lines.forEach((l: any, i: number) => {
      const row = rows[i];
      if (!row) return;
      const f = uf(l.rm, row.u), q = numOf(row.q), r = numOf(row.r), rs = row.rs.trim(), bal = l.qty - l.recv, qb = q * f, rb = r * f;
      if (qb > bal + Math.max(f, bal * 0.05) + 1e-6) bad = `${rmBy[l.rm].name}: arrived is more than the PO balance. Reject the excess at the gate.`;
      if (r > q + 1e-9) bad = `${rmBy[l.rm].name}: rejected is more than arrived.`;
      if (r > 0 && !rs) bad = `${rmBy[l.rm].name}: give a reason for the rejection.`;
      if (q > 0) lines.push({ rm: l.rm, qty: Math.round(qb * 1000) / 1000, gateRej: Math.round(rb * 1000) / 1000, gateReason: rs, ru: row.u, rq: q, rrq: r });
    });
    if (!lines.length) bad = bad || "Enter the quantity that arrived on at least one line.";
    if (bad) errs.lines = bad;
    setE(errs);
    if (Object.keys(errs).length) return;
    lines.forEach((x) => { if (x.gateRej > 0) { const pl = p.lines.find((y: any) => y.rm === x.rm); pl.rej = (pl.rej || 0) + x.gateRej; } });
    const allRej = lines.every((l) => l.gateRej >= l.qty);
    const rejTxt = lines.filter((l) => l.gateRej).map((l) => `${qfmt(l.rrq)} × ${l.ru} ${rmBy[l.rm].name} (${l.gateReason})`).join("; ");
    const g: any = { id: nextId("GE"), dir: "in", date: new Date(TODAY), po: p.id, party: p.vendor, vehicle: v, dc: d, lines, status: allRej ? "Rejected at gate" : "Awaiting GRN", history: [] };
    logD(g, allRej ? "Rejected at gate" : "Vehicle entered",
      [lines.map((l) => `${qfmt(l.rq)} × ${l.ru}${l.ru !== rmBy[l.rm].uom ? ` (= ${qfmt(l.qty)} ${rmBy[l.rm].uom})` : ""}`).join(", "), rejTxt ? "Rejected at gate: " + rejTxt : ""].filter(Boolean).join(". "),
      allRej ? "bad" : rejTxt ? "warn" : "");
    if (rejTxt) logD(p, "Rejected at gate", `${g.id}: ${rejTxt}. Balance stays open.`, "warn");
    GATES.push(g);
    UI.gateTab = "in";
    mustGo("gate"); bump();
    toast(allRej ? `${g.id}: whole consignment rejected at the gate` : `${g.id} recorded${rejTxt ? " with gate rejection" : ""}. Stores can now create the GRN.`);
  };
  return (
    <Modal wide title={`Inward entry against ${p.id}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Save inward entry</button></>}>
      <p>{venBy(p.vendor).name}, {venBy(p.vendor).city}</p>
      <div className="form-grid">
        <Field id="gi-veh" label="Vehicle number *" err={e.veh}><input className={`input ${e.veh ? "invalid" : ""}`} id="gi-veh" value={veh} onChange={(x) => setVeh(x.target.value)} placeholder="e.g. KA 01 AB 1234" /></Field>
        <Field id="gi-dc" label="DC / invoice number *" err={e.dc}><input className={`input ${e.dc ? "invalid" : ""}`} id="gi-dc" value={dc} onChange={(x) => setDc(x.target.value)} /></Field>
      </div>
      <p className="small muted">Record arrivals in the unit on the vendor's delivery challan (pieces, sheets, lengths or kg). Reject anything visibly wrong at the gate; only the rest goes to GRN.</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">Balance on PO</th><th>Unit</th><th className="num">Arrived</th><th className="num">Rejected at gate</th><th>Reason</th></tr></thead>
          <tbody>
            {ls.map((l: any) => {
              const u = l.ou || rmBy[l.rm].uom;
              const row = rows[l.i];
              return (
                <tr key={l.i}>
                  <td><RmCell code={l.rm} /></td>
                  <td className="num">{qfmt(roundQ(l.rm, u, l.bal / uf(l.rm, u)))} × {u}<div className="cell-sub">= {qfmt(l.bal)} {rmBy[l.rm].uom}</div></td>
                  <td style={{ minWidth: 150 }}><UomSel code={l.rm} value={row.u} onChange={(x) => setRow(l.i, { u: x })} /></td>
                  <td className="num"><QtyIn value={row.q} onChange={(x) => setRow(l.i, { q: x })} /></td>
                  <td className="num"><QtyIn value={row.r} onChange={(x) => setRow(l.i, { r: x })} /></td>
                  <td style={{ minWidth: 170 }}><input className="input" value={row.rs} onChange={(x) => setRow(l.i, { rs: x.target.value })} placeholder="If any rejected" aria-label="Gate rejection reason" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ErrLine msg={e.lines} />
    </Modal>
  );
}

export function openGp(pre?: any) {
  if (!allow("gate")) return;
  openModal(<NewGpModal pre={pre} />);
}

const GP_PURPOSES = ["Job work: hard anodising", "Job work: heat treatment", "Return of rejected material", "Repair or calibration", "Sample to customer"];
function NewGpModal({ pre }: { pre?: any }) {
  const [ed, setEd] = useState<Ed>({ grp: false, uom: true, lines: (pre && pre.lines) || [{ rm: "", qty: "" }] });
  const [f, setF] = useState({
    purpose: pre?.purpose || GP_PURPOSES[0], party: pre?.party || "V06", ret: pre && pre.returnable === false ? "0" : "1",
    back: isoLocal(addDays(TODAY, 7)), note: pre?.note || "",
  });
  const [err, setErr] = useState("");
  const save = () => {
    if (!allow("gate")) return;
    const e = edValid(ed);
    setErr(e);
    if (e) return;
    const ret = f.ret === "1";
    const ref = pre?.ref || null;
    const g: any = {
      id: nextId("GP"), dir: "out", returnable: ret, date: new Date(TODAY), party: f.party, purpose: f.purpose, expBack: ret ? fromIso(f.back) : null, ref,
      lines: edBase(ed).map((l) => ({ rm: l.rm, qty: l.qty, back: 0 })), status: PEND, history: [],
    };
    logD(g, "Submitted for approval", f.note.trim(), "info");
    GATES.push(g);
    if (ref) { const gr = GRNS.find((x: any) => x.id === ref); if (gr) gr.returnPass = g.id; }
    UI.gateTab = "out";
    mustGo("gate"); bump(); toast(`${g.id} submitted for approval`);
  };
  return (
    <Modal wide title="New outward gate pass" foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Submit for approval</button></>}>
      <div className="form-grid">
        <Field id="gp-purpose" label="Purpose">
          <select className="input" id="gp-purpose" value={f.purpose} onChange={(x) => setF({ ...f, purpose: x.target.value })}>{GP_PURPOSES.map((x) => <option key={x}>{x}</option>)}</select>
        </Field>
        <Field id="gp-party" label="Party"><select className="input" id="gp-party" value={f.party} onChange={(x) => setF({ ...f, party: x.target.value })}><VenOptions /></select></Field>
        <Field id="gp-ret" label="Type">
          <select className="input" id="gp-ret" value={f.ret} onChange={(x) => setF({ ...f, ret: x.target.value })}>
            <option value="1">Returnable: comes back</option><option value="0">Non-returnable</option>
          </select>
        </Field>
        <Field id="gp-back" label="Expected back by"><input className="input" id="gp-back" type="date" value={f.back} onChange={(x) => setF({ ...f, back: x.target.value })} /></Field>
        <Field id="gp-note" label="Note to approver" span><input className="input" id="gp-note" value={f.note} onChange={(x) => setF({ ...f, note: x.target.value })} /></Field>
      </div>
      <LineEditor ed={ed} onChange={setEd} />
      <ErrLine msg={err} />
    </Modal>
  );
}

export function GateDetail({ id }: { id: string }) {
  const g = GATES.find((x: any) => x.id === id);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  if (g.dir === "in") {
    return (
      <Modal wide title={`Inward entry ${g.id}`}
        foot={<><button className="btn" onClick={closeModal}>Close</button>{g.status === "Awaiting GRN" && canEdit("grn") && <button className="btn primary" onClick={() => openModal(<NewGrnModal gateId={g.id} />)}>Create GRN</button>}</>}>
        <DL pairs={[["Vendor", venBy(g.party).name], ["PO", <span className="mono">{g.po}</span>], ["Vehicle", g.vehicle], ["DC / invoice", g.dc], ["Date", ds(g.date)], ["Status", <DocPill st={g.status} />], g.grn ? ["GRN", <span className="mono">{g.grn}</span>] : null]} />
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Material</th><th className="num">Arrived</th><th className="num">Rejected at gate</th><th>Reason</th><th className="num">Sent to GRN</th></tr></thead>
            <tbody>
              {g.lines.map((l: any, i: number) => (
                <tr key={i}>
                  <td><RmCell code={l.rm} /></td>
                  <td className="num">{l.ru && l.ru !== rmBy[l.rm].uom ? <>{qfmt(l.rq)} × {l.ru}<div className="cell-sub">= {qfmt(l.qty)} {rmBy[l.rm].uom}</div></> : qfmt(l.qty) + " " + rmBy[l.rm].uom}</td>
                  <td className="num"><RejQty q={l.gateRej} /></td><td>{l.gateReason || ""}</td><td className="num">{qfmt(l.qty - (l.gateRej || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <History items={g.history} />
      </Modal>
    );
  }
  const ap = g.status === PEND && canApprove("gate");
  const canRet = g.returnable && ["Out, awaiting return", "Partly returned"].includes(g.status) && canEdit("gate");
  const decide = (v: "approve" | "reject") => { const r = decideDoc("gate", g.id, v, note.trim(), {}); if (r) setErr(r); };
  let foot = <button className="btn" onClick={closeModal}>Close</button>;
  if (ap) foot = <DecideFoot onDecide={decide} />;
  else if (canRet) foot = <><button className="btn" onClick={closeModal}>Close</button><button className="btn primary" onClick={() => openModal(<GpReturnModal id={g.id} />)}>Record material returned</button></>;
  return (
    <Modal wide title={`Outward gate pass ${g.id}`} foot={foot}>
      <DL pairs={[["Party", venBy(g.party).name], ["Purpose", g.purpose], ["Type", g.returnable ? "Returnable" : "Non-returnable"], g.returnable ? ["Expected back", ds(g.expBack)] : null, g.ref ? ["Reference", <span className="mono">{g.ref}</span>] : null, ["Status", <DocPill st={g.status} />]]} />
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">Sent</th>{g.returnable && <><th className="num">Returned</th><th className="num">Pending</th></>}</tr></thead>
          <tbody>
            {g.lines.map((l: any, i: number) => (
              <tr key={i}>
                <td><RmCell code={l.rm} /></td><td className="num">{qfmt(l.qty)} {rmBy[l.rm].uom}</td>
                {g.returnable && <><td className="num">{qfmt(l.back)}</td><td className="num">{qfmt(l.qty - l.back)}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ap && <div className="approval-box"><h3 style={{ fontSize: 14 }}>Your decision</h3><RemarkBox label="Remarks" ph="Required when rejecting" value={note} onChange={setNote} err={err} /></div>}
      <History items={g.history} />
    </Modal>
  );
}

function GpReturnModal({ id }: { id: string }) {
  const g = GATES.find((x: any) => x.id === id);
  const [q, setQ] = useState<string[]>(() => g.lines.map((l: any) => String(l.qty - l.back)));
  const [err, setErr] = useState("");
  const save = () => {
    if (!allow("gate")) return;
    const qs = g.lines.map((l: any, i: number) => Math.min(l.qty - l.back, Math.max(0, numOf(q[i]))));
    if (qs.every((x: number) => x === 0)) return setErr("Enter the quantity returned on at least one line.");
    g.lines.forEach((l: any, i: number) => (l.back += qs[i]));
    g.status = g.lines.every((l: any) => l.back >= l.qty) ? "Returned" : "Partly returned";
    logD(g, g.status === "Returned" ? "Fully returned" : "Partly returned",
      g.lines.map((l: any, i: number) => (qs[i] ? `${qfmt(qs[i])} ${rmBy[l.rm].uom} ${rmBy[l.rm].name}` : "")).filter(Boolean).join(", ") + " back.",
      g.status === "Returned" ? "ok" : "warn");
    closeModal(); bump(); toast(`${g.id}: ${g.status.toLowerCase()}`);
  };
  return (
    <Modal wide title={`Material returned · ${g.id}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
      <p className="muted">Enter what came back now. A part return is fine; the rest stays pending.</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">Pending</th><th className="num">Returned now</th></tr></thead>
          <tbody>
            {g.lines.map((l: any, i: number) => (
              <tr key={i}>
                <td><RmCell code={l.rm} /></td><td className="num">{qfmt(l.qty - l.back)} {rmBy[l.rm].uom}</td>
                <td className="num"><QtyIn value={q[i]} max={l.qty - l.back} onChange={(v) => setQ(q.map((x, j) => (j === i ? v : x)))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ErrLine msg={err} />
    </Modal>
  );
}

/* ================= Goods receipt (GRN) ================= */
export function GrnPage() {
  useErp();
  const waiting = GATES.filter((g: any) => g.dir === "in" && g.status === "Awaiting GRN");
  const list = fOf("grn", GRNS).slice().reverse();
  return (
    <>
      <PageHead route="grn" title="Goods receipt (GRN)" desc="Stores records what was received. QC then accepts all, accepts part or rejects each line. Only accepted quantity goes into stock." />
      {canEdit("grn") && waiting.length > 0 && (
        <div className="banner warn">
          <span><b>{waiting.length} inward entr{waiting.length > 1 ? "ies are" : "y is"} waiting for a GRN:</b> {waiting.map((g: any) => g.id).join(", ")}</span>
          <button className="btn sm primary" onClick={() => openModal(<NewGrnModal gateId={waiting[0].id} />)}>Create GRN</button>
        </div>
      )}
      <ApprovalBanner t="grn" items={GRNS} label="GRN" />
      <StatusSeg k="grn" items={GRNS} order={["all", "Pending QC approval", "Accepted", "Partly accepted", "Rejected"]} />
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>GRN</th><th>Vendor · PO</th><th>Material</th><th className="num">Received</th><th className="num">Accepted</th><th className="num">Rejected</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((g: any) => {
                const mine = canApprove("grn") && g.status === "Pending QC approval";
                const done = g.status !== "Pending QC approval";
                return (
                  <tr key={g.id} className="clickable" onClick={() => openModal(<GrnDetail id={g.id} />)}>
                    <td className="nowrap"><div className="cell-title mono">{g.id}</div><div className="cell-sub">{ds(g.date)} · {g.gate}</div></td>
                    <td>{venBy(g.party).name}<div className="cell-sub mono">{g.po}</div></td>
                    <td style={{ minWidth: 190 }}>{g.lines.map((l: any, i: number) => <div key={i}>{rmBy[l.rm].name}</div>)}</td>
                    <td className="num">{g.lines.map((l: any, i: number) => <div key={i}>{qfmt(l.recv)} {rmBy[l.rm].uom}</div>)}</td>
                    <td className="num">{g.lines.map((l: any, i: number) => <div key={i}>{done ? qfmt(l.acc) : "—"}</div>)}</td>
                    <td className="num">{g.lines.map((l: any, i: number) => <div key={i}>{done ? (l.rej ? <span style={{ color: "var(--bad)", fontWeight: 600 }}>{qfmt(l.rej)}</span> : "0") : "—"}</div>)}</td>
                    <td><DocPill st={g.status} /></td>
                    <td><button className={`btn sm ${mine ? "primary" : ""}`}>{mine ? "Inspect" : "Open"}</button></td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={8} className="empty">No GRNs with this status.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/** GRN with count in the delivered unit and optional weighed kg. */
export function NewGrnModal({ gateId }: { gateId: string }) {
  const g = GATES.find((x: any) => x.id === gateId);
  const [rows, setRows] = useState<Record<number, { u: string; q: string; w: string }>>(() =>
    Object.fromEntries(g.lines.map((l: any, i: number) => {
      const pass = l.qty - (l.gateRej || 0);
      const u = l.ru || rmBy[l.rm].uom;
      return [i, { u, q: String(roundQ(l.rm, u, pass / uf(l.rm, u))), w: "" }];
    })),
  );
  const [err, setErr] = useState("");
  const setRow = (i: number, patch: any) => setRows({ ...rows, [i]: { ...rows[i], ...patch } });
  const lineCalc = (l: any, i: number) => {
    const row = rows[i];
    const u = row.u, q = numOf(row.q), f = uf(l.rm, u), theo = q * f, kf = kgF(l.rm), w = kf ? numOf(row.w) : 0;
    const act = w > 0 && kf ? w * kf : theo;
    const v = theo > 0 && w > 0 ? ((act - theo) / theo) * 100 : null;
    return { u, q, theo, act, w, v };
  };
  const save = () => {
    if (!allow("grn")) return;
    const lines: any[] = [];
    let bad = "";
    g.lines.forEach((l: any, i: number) => {
      const pass = l.qty - (l.gateRej || 0);
      if (pass <= 0) return;
      const r = lineCalc(l, i);
      if (r.q <= 0) return;
      if (r.theo > pass * 1.05 + uf(l.rm, r.u)) bad = `${rmBy[l.rm].name}: counted is more than what passed the gate.`;
      lines.push({ rm: l.rm, recv: Math.round(r.act * 1000) / 1000, acc: 0, rej: 0, reason: "", cnt: r.q, cu: r.u, theo: Math.round(r.theo * 1000) / 1000, wkg: r.w || null, var: r.v });
    });
    if (!lines.length) bad = bad || "Enter a counted quantity on at least one line.";
    if (bad) return setErr(bad);
    const n: any = { id: nextId("GRN"), date: new Date(TODAY), gate: g.id, po: g.po, party: g.party, by: SESSION.user, status: "Pending QC approval", lines, history: [] };
    const flags = lines.filter((l) => l.var != null && Math.abs(l.var) > 3).map((l) => `${rmBy[l.rm].name}: weight ${l.var > 0 ? "+" : ""}${l.var.toFixed(1)}% vs theoretical`);
    logD(n, "Submitted for QC approval",
      [lines.map((l) => `${qfmt(l.cnt)} × ${l.cu}${l.wkg ? `, weighed ${qfmt(l.wkg)} kg` : ""} → ${qfmt(l.recv)} ${rmBy[l.rm].uom}`).join("; "), flags.length ? "Check: " + flags.join("; ") : ""].filter(Boolean).join(". "),
      flags.length ? "warn" : "info");
    GRNS.push(n);
    g.status = "GRN done"; g.grn = n.id;
    UI.f.grn = "all";
    mustGo("grn"); bump(); toast(`${n.id} sent to QC${flags.length ? " · weight variance flagged" : ""}`);
  };
  return (
    <Modal wide title={`GRN for ${g.id}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Submit for QC approval</button></>}>
      <p>{venBy(g.party).name} · PO <span className="mono">{g.po}</span> · {g.dc}</p>
      <p className="small muted">Count in the delivered unit. For metal, also enter the weighbridge or scale weight in kg: stock is taken at the actual weight, and a variance above ±3% against the theoretical weight is flagged for QC.</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">Passed at gate</th><th>Unit</th><th className="num">Counted</th><th className="num">Weighed (kg)</th><th>Weight check</th></tr></thead>
          <tbody>
            {g.lines.map((l: any, i: number) => {
              const pass = l.qty - (l.gateRej || 0);
              if (pass <= 0) return null;
              const u = l.ru || rmBy[l.rm].uom;
              const kf = kgF(l.rm);
              const row = rows[i];
              const r = lineCalc(l, i);
              const b = rmBy[l.rm].uom;
              return (
                <tr key={i}>
                  <td><RmCell code={l.rm} /></td>
                  <td className="num">{qfmt(roundQ(l.rm, u, pass / uf(l.rm, u)))} × {u}<div className="cell-sub">= {qfmt(pass)} {b}</div></td>
                  <td style={{ minWidth: 150 }}><UomSel code={l.rm} value={row.u} onChange={(x) => setRow(i, { u: x })} /></td>
                  <td className="num"><QtyIn value={row.q} onChange={(x) => setRow(i, { q: x })} /></td>
                  <td className="num">{kf ? <QtyIn value={row.w} placeholder="optional" onChange={(x) => setRow(i, { w: x })} /> : <span className="muted small">n/a</span>}</td>
                  <td className="small" style={{ minWidth: 170 }}>
                    {r.v == null
                      ? <>Stock in: <b>{qfmt(Math.round(r.theo * 100) / 100)} {b}</b>{kgF(l.rm) && b !== "kg" ? "" : " (theoretical)"}</>
                      : <>Theoretical {qfmt(Math.round(r.theo * 100) / 100)} {b}, actual <b>{qfmt(Math.round(r.act * 100) / 100)} {b}</b> <Pill t={`${r.v > 0 ? "+" : ""}${r.v.toFixed(1)}%`} c={Math.abs(r.v) > 3 ? "bad" : "ok"} /></>}
                  </td>
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

export function GrnDetail({ id }: { id: string }) {
  const g = GRNS.find((x: any) => x.id === id);
  const ap = g.status === "Pending QC approval" && canApprove("grn");
  const [q, setQ] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    g.lines.forEach((l: any, i: number) => { o["qc-a-" + i] = String(l.recv); o["qc-p-" + i] = String(l.cnt ?? ""); o["qc-r-" + i] = ""; });
    return o;
  });
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const decide = (v: "approve" | "reject") => { const r = decideDoc("grn", g.id, v, note.trim(), q); if (r) setErr(r); };
  const pcChanged = (i: number, val: string) => {
    const l = g.lines[i];
    const next = { ...q, ["qc-p-" + i]: val };
    if (l.cnt) next["qc-a-" + i] = String(Math.round((Math.min(l.cnt, Math.max(0, parseFloat(val) || 0)) * l.recv) / l.cnt * 1000) / 1000);
    setQ(next);
  };
  let foot = <button className="btn" onClick={closeModal}>Close</button>;
  if (ap) foot = <DecideFoot onDecide={decide} rejectLabel="Reject all" />;
  else if (g.lines.some((l: any) => l.rej > 0) && !g.returnPass && canEdit("gate"))
    foot = (
      <>
        <button className="btn" onClick={closeModal}>Close</button>
        <button className="btn primary" onClick={() => openGp({
          ref: g.id, purpose: "Return of rejected material", party: g.party, returnable: false,
          note: `Rejected in ${g.id}: ` + g.lines.filter((l: any) => l.rej).map((l: any) => `${qfmt(l.rej)} ${rmBy[l.rm].uom} ${rmBy[l.rm].name} (${l.reason})`).join("; "),
          lines: g.lines.filter((l: any) => l.rej > 0).map((l: any) => ({ rm: l.rm, qty: l.rej })),
        })}>Create return gate pass</button>
      </>
    );
  return (
    <Modal wide title={`GRN ${g.id}`} foot={foot}>
      <DL pairs={[["Vendor", venBy(g.party).name], ["PO", <span className="mono">{g.po}</span>], ["Gate entry", <span className="mono">{g.gate}</span>], ["Date", ds(g.date)], ["Status", <DocPill st={g.status} />], g.returnPass ? ["Return gate pass", <span className="mono">{g.returnPass}</span>] : null]} />
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">Counted</th><th className="num">Received (stock unit)</th><th className="num">Accepted</th><th className="num">Rejected</th><th>Rejection reason</th></tr></thead>
          <tbody>
            {g.lines.map((l: any, i: number) => {
              const b = rmBy[l.rm].uom;
              const per = l.cnt ? l.recv / l.cnt : null;
              const cntTxt = l.cnt && l.cu && l.cu !== b ? `${qfmt(l.cnt)} × ${l.cu}` : "";
              return (
                <tr key={i}>
                  <td><RmCell code={l.rm} /></td>
                  <td className="num">{cntTxt || "—"}</td>
                  <td className="num">
                    {qfmt(l.recv)} {b}
                    {l.wkg && <div className="cell-sub">weighed {qfmt(l.wkg)} kg</div>}
                    {l.var != null && <div><Pill t={`${l.var > 0 ? "+" : ""}${l.var.toFixed(1)}% vs theoretical`} c={Math.abs(l.var) > 3 ? "bad" : "ok"} /></div>}
                  </td>
                  <td className="num">
                    {ap ? (
                      <>
                        {cntTxt && (
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                            <QtyIn value={q["qc-p-" + i]} max={l.cnt} width={80} title={`Accepted ${l.cu}`} onChange={(v) => pcChanged(i, v)} />
                            <span className="small muted">{l.cu}</span>
                          </div>
                        )}
                        <QtyIn value={q["qc-a-" + i]} max={l.recv} onChange={(v) => setQ({ ...q, ["qc-a-" + i]: v })} />
                        <div className="cell-sub">{b}</div>
                      </>
                    ) : g.status === "Pending QC approval" ? "—" : (
                      <>{qfmt(l.acc)}{per && l.acc ? <div className="cell-sub">{qfmt(Math.round((l.acc / per) * 100) / 100)} × {l.cu}</div> : null}</>
                    )}
                  </td>
                  <td className="num">{ap ? <span className="muted">auto</span> : g.status === "Pending QC approval" ? "—" : <RejQty q={l.rej} />}</td>
                  <td style={{ minWidth: 150 }}>
                    {ap ? <input className="input" value={q["qc-r-" + i]} onChange={(e) => setQ({ ...q, ["qc-r-" + i]: e.target.value })} placeholder="Reason, if any rejected" aria-label="Rejection reason" /> : l.reason || ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ap && (
        <div className="approval-box">
          <h3 style={{ fontSize: 14 }}>QC decision</h3>
          <p className="small muted">Enter accepted pieces (the weight fills in at the actual weight per piece) or the accepted quantity in the base unit. The rest is rejected; give a reason.</p>
          <RemarkBox label="QC remarks" value={note} onChange={setNote} err={err} />
        </div>
      )}
      <History items={g.history} />
    </Modal>
  );
}

/* ================= Vendor bills ================= */
const toBillGrns = () => GRNS.filter((g: any) => ["Accepted", "Partly accepted"].includes(g.status) && g.lines.some((l: any) => l.acc > (l.billed || 0)));

export function BillsPage() {
  useErp();
  const tab = UI.billTab || "bills";
  const pay = BILLS.reduce((s: number, b: any) => s + billBal(b), 0);
  const toBill = toBillGrns();
  return (
    <>
      <PageHead route="bills" title="Vendor bills" desc="Book the vendor invoice against the GRN. The system matches bill, PO and GRN: a matched bill goes straight to payment; a mismatch is held for approval."
        actions={toBill.length ? [<button key="b" className="btn primary" onClick={() => allow("bills") && openModal(<BillPick />)}>Book vendor bill</button>] : undefined} />
      <ApprovalBanner t="bills" items={BILLS} label="vendor bill" />
      <div className="kpis">
        <div className={`kpi ${pay ? "warn" : ""}`}><span className="k-label">Payable to vendors</span><span className="k-value">{inrShort(pay)}</span><span className="k-foot">{BILLS.filter((b: any) => billBal(b) > 0).length} bills open</span></div>
        <div className="kpi"><span className="k-label">GRNs not yet billed</span><span className="k-value">{toBill.length}</span><span className="k-foot">accepted material without a bill</span></div>
        <div className="kpi"><span className="k-label">Debit notes</span><span className="k-value">{DEBITS.length}</span><span className="k-foot">{inrShort(DEBITS.reduce((s: number, d: any) => s + d.total, 0))} recovered from vendors</span></div>
      </div>
      <div className="toolbar">
        <Seg value={tab} onChange={(v) => setUI({ billTab: v })} options={[["bills", `Vendor bills (${BILLS.length})`], ["dn", `Debit notes (${DEBITS.length})`]]} />
      </div>
      {tab === "bills" ? (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Bill</th><th>Vendor · invoice</th><th>GRN · PO</th><th className="num">Billed</th><th className="num">Payable</th><th className="num">Balance</th><th>Match</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {BILLS.slice().reverse().map((b: any) => {
                  const st = billStatus(b);
                  const mine = canApprove("bills") && b.status === PEND;
                  return (
                    <tr key={b.id} className="clickable" onClick={() => openModal(<BillDetail id={b.id} />)}>
                      <td className="nowrap"><div className="cell-title mono">{b.id}</div><div className="cell-sub">{ds(b.date)}</div></td>
                      <td>{venBy(b.vendor).name}<div className="cell-sub">{b.vinv} · {ds(b.vdate)}</div></td>
                      <td className="mono nowrap">{b.grn}<div className="cell-sub">{b.po}</div></td>
                      <td className="num">{inr(billCalc(b).total)}</td><td className="num">{inr(billPayable(b))}</td><td className="num">{inr(billBal(b))}</td>
                      <td><Pill t={b.match} c={b.match === "Matched" ? "ok" : "warn"} /></td><td><Pill t={st.t} c={st.c} /></td>
                      <td className="nowrap"><button className={`btn sm ${mine ? "primary" : ""}`}>{mine ? "Review" : "Open"}</button></td>
                    </tr>
                  );
                })}
                {!BILLS.length && <tr><td colSpan={9} className="empty">No vendor bills yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Debit note</th><th>Vendor</th><th>Against</th><th>Reason</th><th className="num">Taxable</th><th className="num">GST</th><th className="num">Total</th></tr></thead>
              <tbody>
                {DEBITS.slice().reverse().map((d: any) => (
                  <tr key={d.id}>
                    <td className="mono cell-title">{d.id}<div className="cell-sub" style={{ fontFamily: "var(--sans)" }}>{ds(d.date)}</div></td>
                    <td>{venBy(d.vendor).name}</td><td className="mono">{d.ref}</td><td style={{ minWidth: 220 }}>{d.reason}</td>
                    <td className="num">{inr(d.taxable)}</td><td className="num">{inr(d.tax)}</td><td className="num">{inr(d.total)}</td>
                  </tr>
                ))}
                {!DEBITS.length && <tr><td colSpan={7} className="empty">No debit notes. They are created when a bill is approved at less than the billed amount.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function BillPick() {
  const list = toBillGrns();
  const [sel, setSel] = useState(list[0]?.id || "");
  return (
    <Modal title="Book vendor bill" foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={() => sel && openModal(<BillModal grnId={sel} />)}>Continue</button></>}>
      <Field id="bl-grn" label="GRN with accepted material not yet billed">
        <select className="input" id="bl-grn" value={sel} onChange={(e) => setSel(e.target.value)}>
          {list.map((g: any) => <option key={g.id} value={g.id}>{g.id} · {venBy(g.party).name} · {g.po}</option>)}
        </select>
      </Field>
    </Modal>
  );
}

/** Convert a billed line (any unit) to the stock unit; piece units use the actual weight counted at GRN. */
function billConv(pl: any, gl: any, u: string, q: number, r: number) {
  const piece = gl.cnt && gl.recv > 0 && u === gl.cu && u !== rmBy[gl.rm].uom;
  if (piece) {
    const qb = (q * gl.recv) / gl.cnt;
    const over = pl.ou === u ? r > pl.orate * 1.005 + 1e-6 : r / uf(gl.rm, u) > pl.rate * 1.005 + 1e-6;
    return { qb, rb: qb ? (q * r) / qb : 0, over, how: `${qfmt(q)} × ${u} at actual ${qfmt(Math.round((gl.recv / gl.cnt) * 100) / 100)} ${rmBy[gl.rm].uom} each` };
  }
  const f = uf(gl.rm, u);
  return { qb: q * f, rb: r / f, over: r / f > pl.rate * 1.005 + 1e-6, how: f !== 1 ? `= ${qfmt(Math.round(q * f * 100) / 100)} ${rmBy[gl.rm].uom} at ${inr(r / f)}/${rmBy[gl.rm].uom}` : "" };
}

function BillModal({ grnId }: { grnId: string }) {
  const g = GRNS.find((x: any) => x.id === grnId);
  const p = POS.find((x: any) => x.id === g.po);
  const v = venBy(g.party);
  const [vinv, setVinv] = useState("");
  const [vdate, setVdate] = useState(isoLocal(TODAY));
  const [rows, setRows] = useState<Record<number, { u: string; q: string; r: string }>>(() =>
    Object.fromEntries(g.lines.map((l: any, i: number) => {
      const pl = p.lines.find((x: any) => x.rm === l.rm);
      const un = l.acc - (l.billed || 0);
      return [i, { u: rmBy[l.rm].uom, q: String(Math.round(un * 100) / 100), r: String(Math.round(pl.rate * 100) / 100) }];
    })),
  );
  const [e, setE] = useState<Record<string, string>>({});
  const setRow = (i: number, patch: any) => setRows({ ...rows, [i]: { ...rows[i], ...patch } });
  const unitChanged = (i: number, u: string) => {
    const l = g.lines[i];
    const pl = p.lines.find((x: any) => x.rm === l.rm);
    const f = uf(l.rm, u), un = l.acc - (l.billed || 0);
    setRow(i, { u, q: String(Math.round((un / f) * 100) / 100), r: String(Math.round(pl.rate * f * 100) / 100) });
  };
  // 3-way match per line
  let taxable = 0;
  const issues: string[] = [];
  const checks: Record<number, { m: string[]; how: string }> = {};
  g.lines.forEach((l: any, i: number) => {
    const un = l.acc - (l.billed || 0);
    if (un <= 0) return;
    const pl = p.lines.find((x: any) => x.rm === l.rm);
    const row = rows[i];
    const bq = numOf(row.q), br = numOf(row.r);
    taxable += bq * br;
    const cv = billConv(pl, l, row.u, bq, br);
    const m: string[] = [];
    if (cv.qb > un * 1.005 + 1e-6) m.push(`${qfmt(Math.round(cv.qb * 100) / 100)} ${rmBy[l.rm].uom} billed > accepted ${qfmt(un)}`);
    if (cv.over) m.push(`rate above PO ${pl.ou === row.u ? inr(pl.orate) + "/" + row.u : inr(pl.rate) + "/" + rmBy[l.rm].uom}`);
    checks[i] = { m, how: cv.how };
    if (m.length) issues.push(rmBy[l.rm].name + ": " + m.join(", "));
  });
  const t = taxCalc(taxable, venTax(v));
  const save = () => {
    if (!allow("bills")) return;
    const vi = vinv.trim();
    if (!vi) return setE({ vinv: "Enter the vendor invoice number." });
    if (BILLS.some((b: any) => b.vendor === g.party && b.vinv.toLowerCase() === vi.toLowerCase())) return setE({ vinv: "This vendor invoice is already booked." });
    const lines: any[] = [];
    g.lines.forEach((l: any, i: number) => {
      const un = l.acc - (l.billed || 0);
      if (un <= 0) return;
      const row = rows[i];
      const q = numOf(row.q), r = numOf(row.r);
      const pl = p.lines.find((x: any) => x.rm === l.rm);
      const pr = pl.rate;
      if (q > 0) {
        const cv = billConv(pl, l, row.u, q, r);
        let qb = cv.qb, rb = cv.rb;
        if (Math.abs(qb - un) <= un * 0.005) qb = un;
        if (!cv.over && rb > pr) rb = pr;
        lines.push({ rm: l.rm, qty: qb, rate: rb, amt: q * r, bu: row.u, bq: q, brate: r, poRate: pr, accQty: un });
      }
    });
    if (!lines.length) return setE({ lines: "Enter a billed quantity on at least one line." });
    const matched = !issues.length;
    const b: any = {
      id: "BILL-0" + SEQ.bill++, vinv: vi, vdate: fromIso(vdate), date: new Date(TODAY), vendor: g.party, grn: g.id, po: g.po,
      status: matched ? "Approved" : PEND, match: matched ? "Matched" : "On hold: mismatch", lines, pays: [], history: [],
    };
    lines.forEach((l) => { const gl = g.lines.find((x: any) => x.rm === l.rm); gl.billed = (gl.billed || 0) + Math.min(l.qty, l.accQty); });
    logD(b, matched ? "Booked, matched" : "Booked, on hold",
      (lines.some((l) => l.bu !== rmBy[l.rm].uom) ? "Billed as " + lines.map((l) => `${qfmt(l.bq)} ${l.bu} @ ${inr(l.brate)}`).join(", ") + " and converted to stock units. " : "") + (matched ? "Bill, PO and GRN agree." : issues.join("; ")),
      matched ? "ok" : "warn");
    BILLS.push(b);
    UI.billTab = "bills";
    mustGo("bills"); bump();
    toast(matched ? `${b.id} matched and ready for payment` : `${b.id} held for approval: ${issues.length} mismatch${issues.length > 1 ? "es" : ""}`);
  };
  return (
    <Modal wide title={`Vendor bill for ${g.id}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Book bill</button></>}>
      <p>{v.name} · PO <span className="mono">{g.po}</span> · {venTax(v) === "intra" ? "CGST + SGST" : "IGST"} input tax</p>
      <div className="form-grid">
        <Field id="bl-vinv" label="Vendor invoice number *" err={e.vinv}><input className={`input ${e.vinv ? "invalid" : ""}`} id="bl-vinv" value={vinv} onChange={(x) => setVinv(x.target.value)} /></Field>
        <Field id="bl-vdate" label="Vendor invoice date"><input className="input" id="bl-vdate" type="date" value={vdate} onChange={(x) => setVdate(x.target.value)} /></Field>
      </div>
      <p className="small muted">Enter the quantity, unit and rate exactly as printed on the vendor's invoice. If the vendor bills by weight and the PO was in pieces (or the other way round), pick the billed unit: both are converted to the stock unit before matching against the PO rate and the QC-accepted quantity (±0.5% rounding allowed).</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">Accepted, unbilled</th><th className="num">PO rate</th><th>Billed unit</th><th className="num">Billed qty</th><th className="num">Billed rate</th><th>Check</th></tr></thead>
          <tbody>
            {g.lines.map((l: any, i: number) => {
              const pl = p.lines.find((x: any) => x.rm === l.rm);
              const un = l.acc - (l.billed || 0);
              if (un <= 0) return null;
              const row = rows[i];
              const c = checks[i];
              return (
                <tr key={i}>
                  <td><RmCell code={l.rm} /></td>
                  <td className="num">{qfmt(un)} {rmBy[l.rm].uom}<div className="cell-sub">{altHint(l.rm, un)}</div></td>
                  <td className="num"><PoRate l={pl} /></td>
                  <td style={{ minWidth: 120 }}><UomSel code={l.rm} value={row.u} onChange={(u) => unitChanged(i, u)} /></td>
                  <td className="num"><QtyIn value={row.q} width={90} onChange={(x) => setRow(i, { q: x })} /></td>
                  <td className="num"><QtyIn value={row.r} width={100} onChange={(x) => setRow(i, { r: x })} /></td>
                  <td className="small" style={{ minWidth: 120 }}>
                    {c.m.length ? <><Pill t="Mismatch" c="warn" /><div className="cell-sub">{c.m.join("; ")}</div></> : <Pill t="Matched" c="ok" />}
                    {c.how && <div className="cell-sub">{c.how}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="inv-pay">
        <div><span className="muted small">Taxable</span><b>{inr(taxable)}</b></div>
        <div><span className="muted small">Input GST</span><b>{inr(t.tax)}</b></div>
        <div><span className="muted small">Bill total</span><b>{inr(Math.round(taxable + t.tax))}</b></div>
        <div><span className="muted small">3-way match</span><b style={{ color: issues.length ? "var(--warn)" : "var(--ok)" }}>{issues.length ? "Mismatch: goes for approval" : "Matched"}</b></div>
      </div>
      <ErrLine msg={e.lines} />
    </Modal>
  );
}

export function BillDetail({ id }: { id: string }) {
  const b = BILLS.find((x: any) => x.id === id);
  const c = billCalc(b);
  const st = billStatus(b);
  const ap = b.status === PEND && canApprove("bills");
  const mTax = b.lines.reduce((s: number, l: any) => s + Math.min(l.qty, l.accQty) * Math.min(l.rate, l.poRate), 0);
  const mt = taxCalc(mTax, venTax(venBy(b.vendor)));
  const matchedTotal = Math.round(mTax + mt.tax);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const decide = (v: "approve" | "reject") => {
    if (!canApprove("bills")) return toast("Your role cannot approve vendor bills.", true);
    const n = note.trim();
    if (v === "reject") {
      if (!n) return setErr("Give a reason for rejecting the bill.");
      b.status = "Rejected";
      const g = GRNS.find((x: any) => x.id === b.grn);
      b.lines.forEach((l: any) => { const gl = g.lines.find((x: any) => x.rm === l.rm); gl.billed = Math.max(0, (gl.billed || 0) - Math.min(l.qty, l.accQty)); });
      logD(b, "Rejected", n, "bad");
      closeModal(); bump(); toast(`${b.id} rejected and returned to the vendor`); return;
    }
    const v2 = venBy(b.vendor);
    b.approvedTotal = matchedTotal;
    b.status = "Approved";
    const diffTax = c.taxable - mTax;
    let dn: any = null;
    if (diffTax > 0.5) {
      const dt = taxCalc(diffTax, venTax(v2));
      dn = {
        id: "DN-00" + SEQ.dn++, date: new Date(TODAY), vendor: b.vendor, ref: b.id,
        reason: b.lines.map((l: any) => {
          const r: string[] = [];
          if (l.qty > l.accQty) r.push(`${qfmt(l.qty - l.accQty)} ${rmBy[l.rm].uom} billed but not accepted`);
          if (l.rate > l.poRate) r.push(`rate ${inr(l.rate)} above PO ${inr(l.poRate)}`);
          return r.length ? rmBy[l.rm].name + ": " + r.join(", ") : "";
        }).filter(Boolean).join("; "),
        taxable: diffTax, tax: dt.tax, total: Math.round(diffTax + dt.tax),
      };
      DEBITS.push(dn);
    }
    logD(b, "Approved at matched value", `${inr(b.approvedTotal)} payable.${dn ? ` Debit note ${dn.id} raised for ${inr(dn.total)}.` : ""}${n ? " " + n : ""}`, "ok");
    closeModal(); bump(); toast(`${b.id} approved at ${inr(b.approvedTotal)}${dn ? `; debit note ${dn.id} raised` : ""}`);
  };
  let foot = <button className="btn" onClick={closeModal}>Close</button>;
  if (ap) foot = <DecideFoot onDecide={decide} rejectLabel="Reject bill" approveLabel="Approve matched value" />;
  else if (billBal(b) > 0 && b.status !== "Rejected" && canEdit("bills"))
    foot = <><button className="btn" onClick={closeModal}>Close</button><button className="btn primary" onClick={() => openModal(<PayBillModal id={b.id} />)}>Record vendor payment</button></>;
  return (
    <Modal wide title={`Vendor bill ${b.id}`} foot={foot}>
      <DL pairs={[
        ["Vendor", venBy(b.vendor).name], ["Vendor invoice", `${b.vinv} · ${ds(b.vdate)}`], ["GRN · PO", <span className="mono">{b.grn} · {b.po}</span>],
        ["Match", <Pill t={b.match} c={b.match === "Matched" ? "ok" : "warn"} />], ["Status", <Pill t={st.t} c={st.c} />], ["Due", ds(addDays(b.vdate, venBy(b.vendor).terms || 30))],
      ]} />
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Material</th><th className="num">Billed qty</th><th className="num">Accepted (GRN)</th><th className="num">Billed rate</th><th className="num">PO rate</th><th className="num">Billed amount</th></tr></thead>
          <tbody>
            {b.lines.map((l: any, i: number) => {
              const conv = l.bu && l.bu !== rmBy[l.rm].uom;
              return (
                <tr key={i}>
                  <td><RmCell code={l.rm} /></td>
                  <td className="num" style={l.qty > l.accQty * 1.005 ? { color: "var(--bad)", fontWeight: 600 } : undefined}>
                    {conv ? <>{qfmt(l.bq)} {l.bu}<div className="cell-sub">= {qfmt(Math.round(l.qty * 100) / 100)} {rmBy[l.rm].uom}</div></> : `${qfmt(l.qty)} ${rmBy[l.rm].uom}`}
                  </td>
                  <td className="num">{qfmt(l.accQty)}</td>
                  <td className="num" style={l.rate > l.poRate * 1.005 ? { color: "var(--bad)", fontWeight: 600 } : undefined}>
                    {conv ? <>{inr(l.brate)} / {l.bu}<div className="cell-sub">= {inr(l.rate)} / {rmBy[l.rm].uom}</div></> : inr(l.rate)}
                  </td>
                  <td className="num">{inr(l.poRate)} / {rmBy[l.rm].uom}</td>
                  <td className="num">{inr(l.amt != null ? l.amt : l.qty * l.rate)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr><td colSpan={5}>Taxable</td><td className="num">{inr(c.taxable)}</td></tr>
            <tr><td colSpan={5}>Input GST</td><td className="num">{inr(c.tax)}</td></tr>
            <tr><td colSpan={5}>Bill total</td><td className="num">{inr(c.total)}</td></tr>
            <tr><td colSpan={5}><b>Payable</b></td><td className="num"><b>{inr(billPayable(b))}</b></td></tr>
            <tr><td colSpan={5}>Paid</td><td className="num">{inr(billPaid(b))}</td></tr>
          </tfoot>
        </table>
      </div>
      {ap && (
        <div className="approval-box">
          <h3 style={{ fontSize: 14 }}>Your decision</h3>
          <p className="small">Approving pays the <b>matched value {inr(matchedTotal)}</b> (accepted quantity at PO rate). The difference of <b>{inr(c.total - matchedTotal)}</b> is raised as a debit note on the vendor. Reject returns the bill to the vendor.</p>
          <RemarkBox label="Remarks" ph="Required when rejecting" value={note} onChange={setNote} err={err} />
        </div>
      )}
      <History items={b.history} />
    </Modal>
  );
}

function PayBillModal({ id }: { id: string }) {
  const b = BILLS.find((x: any) => x.id === id);
  const bal = billBal(b);
  const [amt, setAmt] = useState(String(bal));
  const [mode, setMode] = useState("NEFT");
  const [ref, setRef] = useState("");
  const [e, setE] = useState<Record<string, string>>({});
  const save = () => {
    if (!allow("bills")) return;
    const a = numOf(amt), r = ref.trim();
    const errs: Record<string, string> = {};
    if (!(a > 0)) errs.amt = "Enter the amount paid."; else if (a > bal + 0.5) errs.amt = `More than the balance of ${inr(bal)}.`;
    if (!r) errs.ref = "Enter the UTR or cheque number.";
    setE(errs);
    if (Object.keys(errs).length) return;
    b.pays.push({ date: new Date(TODAY), amt: a, mode, ref: r });
    logD(b, "Payment made", `${inr(a)} by ${mode} (${r})`, "ok");
    closeModal(); bump(); toast(`${inr(a)} paid on ${b.id} · ${billStatus(b).t.toLowerCase()}`);
  };
  return (
    <Modal title={`Vendor payment · ${b.id}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Save payment</button></>}>
      <p>{venBy(b.vendor).name} · balance <b>{inr(bal)}</b></p>
      <div className="form-grid">
        <Field id="vp-amt" label="Amount paid (₹) *" err={e.amt}><input className={`input num ${e.amt ? "invalid" : ""}`} id="vp-amt" type="number" min={1} step="any" value={amt} onChange={(x) => setAmt(x.target.value)} /></Field>
        <Field id="vp-mode" label="Mode"><select className="input" id="vp-mode" value={mode} onChange={(x) => setMode(x.target.value)}><option>NEFT</option><option>RTGS</option><option>Cheque</option></select></Field>
        <Field id="vp-ref" label="UTR / cheque no. *" err={e.ref}><input className={`input ${e.ref ? "invalid" : ""}`} id="vp-ref" value={ref} onChange={(x) => setRef(x.target.value)} /></Field>
      </div>
      <p className="small muted">A part payment is fine; the bill stays open for the balance.</p>
    </Modal>
  );
}

