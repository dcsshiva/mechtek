import { useState } from "react";
import {
  QUOTES, ORDERS, LEADS, INSTALLED, FG, CHILD_ITEMS, COMBOS, QS, DISC_LIMIT, SEQ, USERS,
  custBy, fgBy, quoteValue, bomCost, isKid, kindLabel, logQ,
} from "@/erp/engine";
import { SESSION } from "@/erp/engine";
import { TODAY, addDays, ds, fromIso, inr, isoLocal, num } from "@/erp/format";
import { UI, canEdit, canSee, denyReason, isAdmin, setUI } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { go } from "@/erp/nav";
import { ErrLine, Field, Modal, PageHead, Pill, QPill, Seg, closeModal, openModal, toast } from "../ui";
import { CreditBanner, CustOptions, ItemsSummary } from "./common";
import { OrderDetail } from "./Orders";

const needsMe = (q: any) => {
  if (!canEdit("quotes")) return false;
  if (isAdmin()) return q.status === QS.pend;
  return [QS.clar, QS.draft, QS.appr].includes(q.status);
};

export function QuotesPage() {
  useErp();
  const order = ["all", QS.pend, QS.clar, QS.draft, QS.appr, QS.sent, QS.rej, QS.conv];
  const cnt = (st: string) => (st === "all" ? QUOTES.length : QUOTES.filter((q: any) => q.status === st).length);
  const list = QUOTES.filter((q: any) => UI.qFilter === "all" || q.status === UI.qFilter)
    .slice()
    .sort((a: any, b: any) => (needsMe(a) ? 0 : 1) - (needsMe(b) ? 0 : 1) || b.date - a.date);
  const pend = cnt(QS.pend), clar = cnt(QS.clar);
  return (
    <>
      <PageHead
        route="quotes"
        title="Quotations"
        desc={isAdmin() ? "Review quotations raised by the sales team: approve, reject, or ask for more details." : "Create quotations and submit them to Admin for approval. Approved quotes can be sent and converted to sales orders."}
        actions={[<button key="n" className="btn primary" onClick={() => openQuote()}>New quotation</button>]}
      />
      {canEdit("quotes") && isAdmin() && pend > 0 && (
        <div className="banner info">
          <span><b>{pend} quotation{pend > 1 ? "s" : ""} waiting for your approval.</b> Quotes with more than {DISC_LIMIT}% discount are flagged.</span>
          <button className="btn sm primary" onClick={() => setUI({ qFilter: QS.pend })}>Review now</button>
        </div>
      )}
      {canEdit("quotes") && !isAdmin() && clar > 0 && (
        <div className="banner warn">
          <span><b>Admin asked for more details on {clar} quotation{clar > 1 ? "s" : ""}.</b> Answer and resubmit.</span>
          <button className="btn sm primary" onClick={() => setUI({ qFilter: QS.clar })}>Show them</button>
        </div>
      )}
      <div className="toolbar" style={{ overflowX: "auto" }}>
        <Seg wrap label="Filter by status" value={UI.qFilter} onChange={(v) => setUI({ qFilter: v })}
          options={order.map((st) => [st, `${st === "all" ? "All" : st} (${cnt(st)})`] as [string, string])} />
      </div>
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Quote</th><th>Customer</th><th>Items</th><th className="num">Net value</th><th className="num">Discount</th><th>Raised by</th><th>Status</th><th>Latest remark</th><th></th></tr></thead>
            <tbody>
              {list.map((q: any) => {
                const last = q.history[q.history.length - 1];
                const c = custBy(q.cust);
                return (
                  <tr key={q.id} className="clickable" onClick={() => openModal(<QuoteDetail id={q.id} />)}>
                    <td className="nowrap"><div className="cell-title mono">{q.id}</div><div className="cell-sub">{ds(q.date)}</div></td>
                    <td className="cell-title" style={{ minWidth: 150 }}>{c.name}<div className="cell-sub" style={{ fontWeight: 400 }}>{c.country}</div></td>
                    <td style={{ minWidth: 190 }}><ItemsSummary lines={q.lines} /></td>
                    <td className="num">{inr(quoteValue(q))}</td>
                    <td className="num">{q.disc}%{q.disc > DISC_LIMIT && <div className="q-flag">Above {DISC_LIMIT}% limit</div>}</td>
                    <td className="nowrap">{USERS[q.by].name}</td>
                    <td><QPill st={q.status} /></td>
                    <td>
                      {last && last.note ? (
                        <div className="remark" title={last.note}><b>{USERS[last.by].name}:</b> {last.note}</div>
                      ) : (
                        <span className="muted small">—</span>
                      )}
                    </td>
                    <td className="nowrap">
                      <button className={`btn sm ${needsMe(q) ? "primary" : ""}`}>{needsMe(q) ? (isAdmin() ? "Review" : "Respond") : "Open"}</button>
                    </td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={9} className="empty">No quotations with this status.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function QRows({ lines }: { lines: any[] }) {
  return (
    <>
      {lines.map((l: any, i: number) => {
        const f = fgBy[l.item];
        const kid = isKid(l);
        return (
          <tr key={i} className={kid ? "kid-row" : ""}>
            <td>
              {kid && <span className="kid-mark" aria-hidden="true">↳</span>}
              {f.name}
              <div className="cell-sub">{kid ? (l.std ? "Standard scope" : "Optional") + " · " : ""}{kindLabel(l.item)}</div>
            </td>
            <td className="num">{l.qty}</td>
            <td className="num">{l.incl ? <Pill t="Included" c="ok" /> : inr(l.price)}</td>
            <td className="num">{l.incl ? "—" : inr(l.qty * l.price)}</td>
          </tr>
        );
      })}
    </>
  );
}

export function QuoteDetail({ id }: { id: string }) {
  const q = QUOTES.find((x: any) => x.id === id);
  const c = custBy(q.cust);
  const gross = q.lines.reduce((s: number, l: any) => s + l.qty * l.price, 0);
  const net = quoteValue(q);
  const mat = q.lines.reduce((s: number, l: any) => s + bomCost(l.item) * l.qty, 0);
  const matPct = (mat / net) * 100;
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const checks = isAdmin() ? (
    <div className="check-row">
      {q.disc > DISC_LIMIT ? <Pill t={`Discount ${q.disc}%: above ${DISC_LIMIT}% limit`} c="warn" /> : <Pill t={`Discount ${q.disc}%: within policy`} c="ok" />}
      <Pill t={`Material cost ${matPct.toFixed(0)}% of net value`} c={matPct > 35 ? "bad" : matPct > 25 ? "warn" : "ok"} />
      {(q.dropStd || []).length ? <Pill t={`Standard scope removed: ${q.dropStd.length} item${q.dropStd.length > 1 ? "s" : ""}`} c="warn" /> : <Pill t="Full standard scope" c="ok" />}
      <Pill t={c.country === "India" ? "Domestic customer" : "Export customer"} c={c.country === "India" ? "" : "info"} />
      <Pill t={`${INSTALLED.filter((i: any) => i.cust === q.cust).length} machines already installed`} />
    </div>
  ) : null;

  const guard = () => {
    const d = denyReason("quotes");
    if (d) {
      toast(d, true);
      return false;
    }
    return true;
  };
  const decide = (v: "approve" | "reject" | "clar") => {
    if (!isAdmin()) return toast("Your role cannot approve quotations.", true);
    const n = note.trim();
    if (v !== "approve" && !n)
      return setErr(v === "reject" ? "Give a reason for rejecting, so the sales executive knows what to change." : "Write what details you need from the sales executive.");
    if (v === "approve") { q.status = QS.appr; logQ(q, "Approved", n, "ok"); }
    else if (v === "reject") { q.status = QS.rej; logQ(q, "Rejected", n, "bad"); }
    else { q.status = QS.clar; logQ(q, "More details requested", n, "warn"); }
    closeModal();
    bump();
    toast(v === "approve" ? `${q.id} approved` : v === "reject" ? `${q.id} rejected` : `${q.id} returned to ${USERS[q.by].name} for more details`);
  };
  const edit = () => { if (guard()) openModal(<QuoteForm prefill={{ editId: q.id, cust: q.cust, lead: q.lead, disc: q.disc, lines: q.lines }} />); };
  const send = () => {
    if (!guard()) return;
    q.status = QS.sent; logQ(q, "Sent to customer", "", "");
    closeModal(); bump(); toast(`${q.id} marked as sent`);
  };
  const convert = () => { if (guard()) openModal(<SoFromQuote qid={q.id} />); };
  const copy = () => {
    if (!guard()) return;
    const n: any = { id: "Q-0" + SEQ.q++, cust: q.cust, date: new Date(TODAY), by: SESSION.user, lines: q.lines.map((l: any) => ({ ...l })), disc: Math.min(q.disc, DISC_LIMIT), status: QS.draft, lead: q.lead, history: [] };
    QUOTES.push(n);
    logQ(n, "Draft created", `Revised from ${q.id} after rejection.`, "");
    bump();
    openModal(<QuoteForm prefill={{ editId: n.id, cust: n.cust, lead: n.lead, disc: n.disc, lines: n.lines }} />);
    toast(`${n.id} created from ${q.id}`);
  };

  let foot = <button className="btn" onClick={closeModal}>Close</button>;
  let actionBox = null;
  if (isAdmin() && q.status === QS.pend) {
    actionBox = (
      <div className="approval-box">
        <h3 style={{ fontSize: 14 }}>Your decision</h3>
        {checks}
        <div className="field">
          <label htmlFor="ap-note">Remarks to {USERS[q.by].name}</label>
          <textarea className="input" id="ap-note" rows={3} placeholder="Required for Reject and Need more details" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <ErrLine msg={err} />
      </div>
    );
    foot = (
      <>
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn" style={{ color: "var(--bad)" }} onClick={() => decide("reject")}>Reject</button>
        <button className="btn" onClick={() => decide("clar")}>Need more details</button>
        <button className="btn primary" onClick={() => decide("approve")}>Approve</button>
      </>
    );
  } else if ((!isAdmin() && [QS.draft, QS.clar].includes(q.status)) || (isAdmin() && q.status === QS.draft)) {
    foot = <><button className="btn" onClick={closeModal}>Close</button><button className="btn primary" onClick={edit}>{q.status === QS.clar ? "Answer and resubmit" : "Edit and submit"}</button></>;
  } else if (q.status === QS.appr) {
    foot = <><button className="btn" onClick={closeModal}>Close</button><button className="btn" onClick={send}>Mark sent to customer</button><button className="btn primary" onClick={convert}>Convert to sales order</button></>;
  } else if (q.status === QS.sent) {
    foot = <><button className="btn" onClick={closeModal}>Close</button><button className="btn primary" onClick={convert}>Convert to sales order</button></>;
  } else if (q.status === QS.rej && !isAdmin()) {
    foot = <><button className="btn" onClick={closeModal}>Close</button><button className="btn primary" onClick={copy}>Create revised quote</button></>;
  }

  return (
    <Modal wide title={`Quotation ${q.id}`} foot={foot}>
      <dl className="detail-grid">
        <div><dt>Customer</dt><dd>{c.name}</dd></div>
        <div><dt>Location</dt><dd>{c.city}, {c.country}</dd></div>
        <div><dt>Raised by</dt><dd>{USERS[q.by].name}</dd></div>
        <div><dt>Date</dt><dd>{ds(q.date)}</dd></div>
        <div><dt>Status</dt><dd><QPill st={q.status} /></dd></div>
        {q.so && <div><dt>Sales order</dt><dd className="mono">{q.so}</dd></div>}
      </dl>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">List price</th><th className="num">Amount</th></tr></thead>
          <tbody><QRows lines={q.lines} /></tbody>
          <tfoot>
            <tr><td colSpan={3}>Gross</td><td className="num">{inr(gross)}</td></tr>
            <tr><td colSpan={3}>Discount {q.disc}%</td><td className="num">− {inr(gross - net)}</td></tr>
            <tr><td colSpan={3}>Net value (before tax)</td><td className="num">{inr(net)}</td></tr>
          </tfoot>
        </table>
      </div>
      {actionBox || (isAdmin() && q.status !== QS.pend ? checks : null)}
      <div>
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Approval history</h3>
        <div className="hist">
          {q.history.map((h: any, i: number) => (
            <div key={i} className={`hist-item ${h.cls}`}>
              <div className="hist-head">
                <b>{h.act}</b>
                <span className="muted">{USERS[h.by].name} · {USERS[h.by].title}</span>
                <span className="muted small">{ds(h.at)}{h.time ? " · " + h.time : ""}</span>
              </div>
              {h.note && <div className="hist-note">{h.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Quotation form with combo sets ---------------- */
const QT_N = 4;
type Kid = { on: boolean; q: string; touched: boolean };
type Block = { item: string; qty: string; kids: Kid[] };

const defaultKids = (item: string, mq: number): Kid[] =>
  item && COMBOS[item] ? COMBOS[item].lines.map((k: any) => ({ on: !!k.std, q: String(k.qty * mq), touched: false })) : [];

function MainOptions() {
  const grp: [string, any[]][] = [
    ["Machines", FG.filter((f: any) => f.kind === "machine")],
    ["Change parts", FG.filter((f: any) => f.kind === "part")],
    ["Spares and accessories", CHILD_ITEMS.filter((c: any) => c.kind === "spare" || c.kind === "accessory")],
    ["Services and documents", CHILD_ITEMS.filter((c: any) => c.kind === "service" || c.kind === "doc")],
  ];
  return (
    <>
      {grp.map(([g, a]) => (
        <optgroup key={g} label={g}>
          {a.map((f: any) => (
            <option key={f.code} value={f.code}>
              {f.name}{COMBOS[f.code] && COMBOS[f.code].lines.length ? " (combo set)" : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export function openQuote(prefill?: any) {
  const d = denyReason("quotes");
  if (d) return toast(d, true);
  openModal(<QuoteForm prefill={prefill} />);
}

export function QuoteForm({ prefill }: { prefill?: any }) {
  const p = prefill || { cust: "C001", lines: [{ item: "FG-EBP", qty: 1 }] };
  const editing = p.editId ? QUOTES.find((q: any) => q.id === p.editId) : null;
  const clarNote = editing && editing.status === QS.clar ? editing.history.filter((h: any) => h.act === "More details requested").pop() : null;

  const [blocks, setBlocks] = useState<Block[]>(() => {
    const mains: any[] = [];
    p.lines.forEach((l: any, idx: number) => {
      if (!isKid(l)) mains.push({ ...l, kids: p.lines.some((k: any) => isKid(k)) || l.kidsSaved ? p.lines.filter((k: any) => k.pi === idx) : null });
    });
    return Array.from({ length: QT_N }, (_, i) => {
      const m = mains[i] || {};
      const item = m.item || "";
      const mq = m.qty || 1;
      let kids = defaultKids(item, mq);
      if (m.kids && item && COMBOS[item]) {
        const prevBy = Object.fromEntries(m.kids.map((l: any) => [l.item, l]));
        kids = COMBOS[item].lines.map((k: any) => {
          const pr = prevBy[k.item];
          return { on: !!pr, q: String(pr ? pr.qty : k.qty * mq), touched: !!pr };
        });
      }
      return { item, qty: String(mq), kids };
    });
  });
  const [cust, setCust] = useState(p.cust);
  const [disc, setDisc] = useState(String(p.disc || 0));
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const upd = (i: number, b: Partial<Block>) => setBlocks(blocks.map((x, j) => (j === i ? { ...x, ...b } : x)));
  const setMain = (i: number, item: string) => upd(i, { item, kids: defaultKids(item, Math.max(1, +blocks[i]!.qty || 1)) });
  const setMq = (i: number, v: string) => {
    const mq = Math.max(1, +v || 1);
    const c = COMBOS[blocks[i]!.item];
    upd(i, { qty: v, kids: blocks[i]!.kids.map((k, j) => (k.touched || !c ? k : { ...k, q: String((c.lines[j]?.qty || 1) * mq) })) });
  };
  const setKid = (i: number, j: number, k: Partial<Kid>) => upd(i, { kids: blocks[i]!.kids.map((x, n) => (n === j ? { ...x, ...k } : x)) });

  // Values per block
  const calc = blocks.map((b) => {
    const mq = Math.max(1, +b.qty || 1);
    let v = b.item ? fgBy[b.item].price * mq : 0;
    const drop: string[] = [];
    const cells: string[] = [];
    const c = b.item && COMBOS[b.item];
    if (c)
      c.lines.forEach((k: any, j: number) => {
        const kid = b.kids[j];
        if (!kid || !kid.on) { cells.push("—"); if (k.std) drop.push(fgBy[k.item].name); return; }
        if (k.incl) { cells.push("—"); return; }
        const a = fgBy[k.item].price * (+kid.q || 0);
        v += a;
        cells.push(inr(a));
      });
    return { v, drop, cells };
  });
  const d = +disc || 0;
  const total = calc.reduce((s, x) => s + x.v, 0) * (1 - d / 100);

  const save = (submit: boolean) => {
    const lines: any[] = [], dropped: string[] = [];
    blocks.forEach((b) => {
      if (!b.item) return;
      const mq = Math.max(1, Math.round(+b.qty || 1));
      const pi = lines.length;
      lines.push({ item: b.item, qty: mq, price: fgBy[b.item].price, kidsSaved: !!COMBOS[b.item] });
      const c = COMBOS[b.item];
      if (c)
        c.lines.forEach((k: any, j: number) => {
          const kid = b.kids[j];
          if (!kid) return;
          if (kid.on) lines.push({ item: k.item, qty: Math.max(1, Math.round(+kid.q || 1)), price: k.incl ? 0 : fgBy[k.item].price, list: fgBy[k.item].price, pi, incl: !!k.incl, std: !!k.std });
          else if (k.std) dropped.push(`${fgBy[k.item].name} (${fgBy[b.item].name})`);
        });
    });
    const n = note.trim();
    const dd = Math.min(30, Math.max(0, +disc || 0));
    if (!lines.length) return setErr("Add at least one main item to the quotation.");
    let q = editing;
    const wasClar = q && q.status === QS.clar;
    if (submit && wasClar && !n) return setErr("Write your answer to Admin before resubmitting.");
    if (submit && dd > DISC_LIMIT && !n) return setErr(`Discount is above ${DISC_LIMIT}%. Add a note explaining why before submitting.`);
    if (submit && dropped.length && !n) return setErr("Standard scope was removed. Add a note to Admin explaining why before submitting.");
    if (!q) {
      q = { id: "Q-0" + SEQ.q++, cust, date: new Date(TODAY), by: SESSION.user, lines, disc: dd, status: QS.draft, lead: p.lead || null, history: [], dropStd: dropped };
      QUOTES.push(q);
      logQ(q, "Draft created", submit ? "" : n, "");
    } else {
      q.cust = cust; q.lines = lines; q.disc = dd; q.dropStd = dropped;
      if (!submit) logQ(q, "Edited", n, "");
    }
    if (submit) { q.status = QS.pend; logQ(q, wasClar ? "Resubmitted with details" : "Submitted for approval", n, "info"); }
    if (q.lead) {
      const l = LEADS.find((x: any) => x.id === q.lead);
      if (l && !["Won", "Lost"].includes(l.stage)) l.stage = "Quoted";
    }
    closeModal();
    UI.qFilter = "all";
    bump();
    go("quotes");
    toast(submit ? `${q.id} submitted to Admin for approval` : `${q.id} saved as draft`);
  };

  return (
    <Modal
      wide
      title={editing ? `Edit quotation ${editing.id}` : "New quotation"}
      foot={
        <>
          <button className="btn" onClick={closeModal}>Cancel</button>
          <button className="btn" onClick={() => save(false)}>Save as draft</button>
          <button className="btn primary" onClick={() => save(true)}>{clarNote ? "Resubmit for approval" : "Submit for approval"}</button>
        </>
      }
    >
      {clarNote && <div className="banner warn" style={{ display: "block" }}><b>Admin asked:</b> {clarNote.note}</div>}
      <div className="form-grid">
        <Field id="qt-cust" label="Customer">
          <select className="input" id="qt-cust" value={cust} onChange={(e) => setCust(e.target.value)}><CustOptions /></select>
        </Field>
        <div className="field">
          <label htmlFor="qt-disc">Discount %</label>
          <input className="input" id="qt-disc" type="number" min={0} max={30} value={disc} onChange={(e) => setDisc(e.target.value)} />
          <span className="small muted" style={d > DISC_LIMIT ? { color: "var(--warn)" } : undefined}>
            {d > DISC_LIMIT ? `Above the ${DISC_LIMIT}% limit: explain the reason in the note to Admin.` : `Up to ${DISC_LIMIT}% is within policy. Admin reviews every quote.`}
          </span>
        </div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Pick a main item: its combo set drops down with the standard scope ticked. Tick the optional items the customer wants.{" "}
        {canSee("combos") && <a href="/combos" onClick={(e) => { e.preventDefault(); closeModal(); go("combos"); }}>Combo sets master</a>}
      </p>
      {blocks.map((b, i) => {
        const c = b.item && COMBOS[b.item];
        const cv = calc[i]!;
        return (
          <div className="qt-block" key={i}>
            <div className="form-grid" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,.6fr) minmax(0,1fr)" }}>
              <Field id={`qt-item-${i}`} label={`Main item ${i + 1}`}>
                <select className="input" id={`qt-item-${i}`} value={b.item} onChange={(e) => setMain(i, e.target.value)}>
                  <option value="">—</option>
                  <MainOptions />
                </select>
              </Field>
              <Field id={`qt-qty-${i}`} label="Qty">
                <input className="input" id={`qt-qty-${i}`} type="number" min={1} value={b.qty} onChange={(e) => setMq(i, e.target.value)} />
              </Field>
              <div className="field">
                <label>Set value</label>
                <div className="input num" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", background: "var(--surface-2)" }}>{cv.v ? inr(cv.v) : "—"}</div>
              </div>
            </div>
            {c && c.lines.length > 0 && (
              <div className="qt-kids">
                <div className="qt-kids-head">
                  <span>Combo set: tick what goes into this quotation</span>
                  <span className="small muted">{c.lines.filter((k: any) => k.std).length} standard · {c.lines.filter((k: any) => !k.std).length} optional</span>
                </div>
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th style={{ width: 36 }}><span className="sr-only">Include</span></th><th>Child item</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Amount</th></tr></thead>
                    <tbody>
                      {c.lines.map((k: any, j: number) => {
                        const f = fgBy[k.item];
                        const kid = b.kids[j] || { on: false, q: "1", touched: false };
                        if (!f) return null;
                        return (
                          <tr key={j} style={kid.on ? undefined : { opacity: 0.55 }}>
                            <td><input type="checkbox" id={`qk-c-${i}-${j}`} checked={kid.on} onChange={(e) => setKid(i, j, { on: e.target.checked })} aria-label={`Include ${f.name}`} style={{ width: 16, height: 16, accentColor: "var(--primary)" }} /></td>
                            <td style={{ minWidth: 210 }}>
                              <label htmlFor={`qk-c-${i}-${j}`} className="cell-title" style={{ fontWeight: 500 }}>{f.name}</label>
                              <div className="cell-sub">{k.std ? <b>Standard scope</b> : "Optional"} · {kindLabel(k.item)}{k.note ? " · " + k.note : ""}</div>
                            </td>
                            <td className="num"><input className="input num" type="number" min={1} step={1} value={kid.q} onChange={(e) => setKid(i, j, { q: e.target.value, touched: true })} style={{ width: 70 }} aria-label={`Quantity of ${f.name}`} /></td>
                            <td className="num nowrap">{k.incl ? <Pill t="Included" c="ok" /> : inr(f.price)}</td>
                            <td className="num nowrap">{cv.cells[j]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {cv.drop.length > 0 && (
                  <p className="small" role="status" style={{ color: "var(--warn)", margin: "6px 0 0" }}>
                    Standard scope removed: {cv.drop.join(", ")}. Explain why in the note to Admin.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        <span className="muted">Net quotation value (sample list prices)</span>
        <span className="cell-title num" style={{ fontSize: 18 }}>{inr(total)}</span>
      </div>
      <div className="field">
        <label htmlFor="qt-note">{clarNote ? "Your answer to Admin (required to resubmit)" : "Note to approver"}</label>
        <textarea className="input" id="qt-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={clarNote ? "Answer each point Admin raised" : "Why this price, discount or scope? Delivery, payment terms, competition"} />
      </div>
      <ErrLine msg={err} />
    </Modal>
  );
}

/* ---------------- Sales order from customer PO ---------------- */
function SoFromQuote({ qid }: { qid: string }) {
  const q = QUOTES.find((x: any) => x.id === qid);
  const mach = q.lines.some((l: any) => fgBy[l.item].kind === "machine");
  const [po, setPo] = useState("");
  const [poDate, setPoDate] = useState(isoLocal(TODAY));
  const [due, setDue] = useState(isoLocal(addDays(TODAY, mach ? 60 : 25)));
  const [adv, setAdv] = useState("30");
  const [e, setE] = useState("");
  const save = () => {
    const p = po.trim();
    if (!p) return setE("Enter the customer PO number.");
    const o: any = {
      id: "SO-" + SEQ.so++, cust: q.cust, date: new Date(TODAY), due: fromIso(due), lines: q.lines.map((l: any) => ({ ...l, disp: 0 })),
      disc: q.disc, advance: false, dispatched: false, custPO: p, custPODate: fromIso(poDate),
      advancePct: Math.min(100, Math.max(0, num(adv))), advanceAmt: 0, payments: [], quote: q.id,
    };
    ORDERS.push(o);
    q.status = QS.conv;
    q.so = o.id;
    logQ(q, "Converted to sales order", `Sales order ${o.id} created against customer PO ${p}.`, "ok");
    if (q.lead) {
      const l = LEADS.find((x: any) => x.id === q.lead);
      if (l) { l.stage = "Won"; l.follow = null; }
    }
    UI.mrpSel = null;
    bump();
    go("orders");
    toast(`Sales order ${o.id} created from ${q.id}`);
    openModal(<OrderDetail id={o.id} />);
  };
  return (
    <Modal title={`Sales order from ${q.id}`} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Create sales order</button></>}>
      <p>{custBy(q.cust).name} · <ItemsSummary lines={q.lines} sep="comma" /> · net {inr(quoteValue(q))} before GST</p>
      <CreditBanner cid={q.cust} />
      <p className="small muted">Record the customer's purchase order. The sales order is created at the approved quotation price.</p>
      <div className="form-grid">
        <Field id="so-po" label="Customer PO number *" err={e}>
          <input className={`input ${e ? "invalid" : ""}`} id="so-po" value={po} onChange={(x) => setPo(x.target.value)} placeholder="As printed on the customer's PO" />
        </Field>
        <Field id="so-podate" label="Customer PO date"><input className="input" id="so-podate" type="date" value={poDate} onChange={(x) => setPoDate(x.target.value)} /></Field>
        <Field id="so-due" label="Committed delivery"><input className="input" id="so-due" type="date" value={due} onChange={(x) => setDue(x.target.value)} /></Field>
        <Field id="so-adv" label="Advance terms (% of order value incl. GST)"><input className="input num" id="so-adv" type="number" min={0} max={100} value={adv} onChange={(x) => setAdv(x.target.value)} /></Field>
      </div>
    </Modal>
  );
}
