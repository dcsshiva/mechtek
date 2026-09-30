// Pieces shared by the purchase, stores and engineering screens: the material line editor,
// status filters, approval banners, unit pickers and small cells.
import type { ReactNode } from "react";
import { CATS, G, PEND, RM, VENDORS, mrp, rmBy, uomsOf, uf } from "@/erp/engine";
import { inr, qfmt } from "@/erp/format";
import { UI, canApprove, denyReason, setUI } from "@/erp/session";
import { go } from "@/erp/nav";
import { Seg, toast } from "../ui";

/** Permission guard for an action: shows the reason and returns false when the role may not act. */
export function allow(mod: string) {
  const d = denyReason(mod);
  if (d) {
    toast(d, true);
    return false;
  }
  return true;
}

export const RmCell = ({ code }: { code: string }) => (
  <>
    {rmBy[code].name}
    <div className="cell-sub mono">{code}</div>
  </>
);

/** Quantity input as used in document modals (qIn in the prototype). */
export function QtyIn({ value, onChange, max, width = 110, title, placeholder, ...rest }: {
  value: string | number; onChange: (v: string) => void; max?: number; width?: number; title?: string; placeholder?: string; [k: string]: any;
}) {
  return (
    <input
      className="input num" type="number" min={0} max={max} step="any" value={value} title={title} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} style={{ width }} {...rest}
    />
  );
}

export function RemarkBox({ label, ph, value, onChange, err }: { label: ReactNode; ph?: string; value: string; onChange: (v: string) => void; err?: string }) {
  return (
    <div className="field">
      <label htmlFor="d-note">{label}</label>
      <textarea className={`input ${err ? "invalid" : ""}`} id="d-note" rows={2} placeholder={ph || ""} value={value} onChange={(e) => onChange(e.target.value)} />
      {err ? <span className="field-err">{err}</span> : null}
    </div>
  );
}

export const VenOptions = () => (
  <>
    {VENDORS.map((v: any) => (
      <option key={v.id} value={v.id}>{v.name} · {v.city}</option>
    ))}
  </>
);

export function UomSel({ code, value, onChange, id }: { code: string; value: string; onChange: (u: string) => void; id?: string }) {
  return (
    <select className="input" id={id} value={value} onChange={(e) => onChange(e.target.value)} style={{ minWidth: 0, width: "100%", maxWidth: 230 }} aria-label="Unit">
      {uomsOf(code).map((x: any) => (
        <option key={x.u} value={x.u}>{x.u}{x.f !== 1 ? ` = ${qfmt(x.f)} ${rmBy[code].uom}` : ""}</option>
      ))}
    </select>
  );
}

/** PO line quantity: in the order unit with the base-unit equivalent. */
export const PoQ = ({ l }: { l: any }) =>
  l.ou && l.ou !== rmBy[l.rm].uom ? (
    <>{qfmt(l.oq)} × {l.ou}<div className="cell-sub">= {qfmt(l.qty)} {rmBy[l.rm].uom}</div></>
  ) : (
    <>{qfmt(l.qty)} {rmBy[l.rm].uom}</>
  );
export const PoRate = ({ l }: { l: any }) =>
  l.ou && l.ou !== rmBy[l.rm].uom ? (
    <>{inr(l.orate)} / {l.ou}<div className="cell-sub">= {inr(l.rate)} / {rmBy[l.rm].uom}</div></>
  ) : (
    <>{inr(l.rate)} / {rmBy[l.rm].uom}</>
  );

export const RejQty = ({ q }: { q: number }) => (q ? <span style={{ color: "var(--bad)", fontWeight: 600 }}>{qfmt(q)}</span> : <>0</>);

/* ---------------- Status filter, approval banner ---------------- */
export const fOf = (key: string, items: any[]) => {
  const c = UI.f[key] || "all";
  return items.filter((d) => c === "all" || d.status === c);
};

export function StatusSeg({ k, items, order }: { k: string; items: any[]; order: string[] }) {
  const cnt = (st: string) => (st === "all" ? items.length : items.filter((d) => d.status === st).length);
  const cur = UI.f[k] || "all";
  const used = order.filter((st) => st === "all" || cnt(st) > 0);
  return (
    <div className="toolbar">
      <Seg label="Filter by status" wrap value={cur} onChange={(v) => setUI({ f: { ...UI.f, [k]: v } })}
        options={used.map((st) => [st, `${st === "all" ? "All" : st} (${cnt(st)})`] as [string, string])} />
    </div>
  );
}

/** Banner for approvers; "Review now" filters the list to documents waiting for approval. */
export function ApprovalBanner({ t, items, label }: { t: string; items: any[]; label: string }) {
  const n = items.filter((d) => d.status === PEND || d.status === "Pending QC approval").length;
  if (!canApprove(t) || !n) return null;
  const review = () => {
    const v = t === "grn" ? "Pending QC approval" : PEND;
    if (t === "gate") setUI({ gateTab: "out", f: { ...UI.f, gate: undefined } });
    else setUI({ f: { ...UI.f, [t]: v } });
    go(t);
  };
  return (
    <div className="banner info">
      <span><b>{n} {label}{n > 1 ? "s" : ""} waiting for your approval.</b> Open one to approve fully, approve partly or reject.</span>
      <button className="btn sm primary" onClick={review}>Review now</button>
    </div>
  );
}

/* ---------------- Line editor (BOM, indent, requisition, gate pass, direct PO) ---------------- */
export type EdLine = { rm: string; qty: number | string; grp?: string; u?: string };
export type Ed = { grp: boolean; uom: boolean; lines: EdLine[] };

export function edValid(e: Ed) {
  const ls = e.lines.filter((l) => l.rm || l.qty);
  if (!ls.length) return "Add at least one line.";
  if (ls.some((l) => !l.rm)) return "Choose a material on every line, or remove the empty line.";
  if (ls.some((l) => !(Number(l.qty) > 0))) return "Every line needs a quantity above zero.";
  const keys = ls.map((l) => (e.grp ? (l.grp || "").trim().toLowerCase() + "|" : "") + l.rm);
  if (new Set(keys).size !== keys.length)
    return e.grp
      ? "The same material appears twice in one sub-assembly. Combine the quantities into one line."
      : "The same material appears twice. Combine it into one line.";
  if (e.grp && ls.some((l) => !(l.grp || "").trim())) return "Give every line a sub-assembly, such as Frame & body.";
  return "";
}

/** Lines converted to the stock (base) unit; eu/eq keep the unit and quantity as entered. */
export function edBase(e: Ed) {
  return e.lines
    .filter((l) => l.rm)
    .map((l) => {
      const u = l.u || rmBy[l.rm].uom;
      const q = Number(l.qty) || 0;
      return { ...l, qty: Math.round(q * uf(l.rm, u) * 1000) / 1000, eu: u, eq: q };
    });
}

export function LineEditor({ ed, onChange }: { ed: Ed; onChange: (e: Ed) => void }) {
  const set = (i: number, patch: Partial<EdLine>) => onChange({ ...ed, lines: ed.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const add = () => onChange({ ...ed, lines: [...ed.lines, { rm: "", qty: "", grp: ed.grp && ed.lines.length ? ed.lines[ed.lines.length - 1].grp : "" }] });
  const del = (i: number) => onChange({ ...ed, lines: ed.lines.filter((_, j) => j !== i) });
  const total = ed.lines.reduce((s, l) => s + (l.rm && l.qty ? rmBy[l.rm].rate * Number(l.qty) : 0), 0);
  return (
    <>
      <datalist id="grp-list">
        {Object.values(G).map((g: any) => <option key={g} value={g} />)}
      </datalist>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {ed.grp && <th>Sub-assembly</th>}
              <th>Raw material</th><th className="num">Qty{ed.grp ? " per unit" : ""}</th><th>{ed.uom ? "Unit" : "UoM"}</th><th className="num">In stock</th>
              {ed.grp && <th className="num">Amount</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ed.lines.map((l, i) => {
              const r = l.rm ? rmBy[l.rm] : null;
              return (
                <tr key={i}>
                  {ed.grp && (
                    <td style={{ minWidth: 170 }}>
                      <input className="input" list="grp-list" value={l.grp || ""} onChange={(e) => set(i, { grp: e.target.value })} aria-label={`Sub-assembly, line ${i + 1}`} />
                    </td>
                  )}
                  <td style={{ minWidth: 250 }}>
                    <select className="input" value={l.rm} onChange={(e) => set(i, { rm: e.target.value, u: undefined })} aria-label={`Raw material, line ${i + 1}`}>
                      <option value="">Select material…</option>
                      {CATS.map((c: string, ci: number) => (
                        <optgroup key={c} label={c}>
                          {RM.filter((x: any) => x.cat === ci).map((x: any) => <option key={x.code} value={x.code}>{x.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input className="input num" type="number" min={0} step="any" value={l.qty || ""} style={{ width: 100 }} aria-label={`Quantity, line ${i + 1}`}
                      onChange={(e) => set(i, { qty: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td style={ed.uom ? { minWidth: 150 } : undefined}>
                    {ed.uom && r ? <UomSel code={l.rm} value={l.u || r.uom} onChange={(u) => set(i, { u })} /> : r ? r.uom : ""}
                  </td>
                  <td className="num muted">{r && !r.service ? qfmt(r.onHand) + " " + r.uom : "—"}</td>
                  {ed.grp && <td className="num">{r && l.qty ? inr(r.rate * Number(l.qty)) : "—"}</td>}
                  <td><button type="button" className="btn sm ghost" onClick={() => del(i)} style={{ color: "var(--bad)" }}>Remove</button></td>
                </tr>
              );
            })}
            {!ed.lines.length && <tr><td colSpan={7} className="empty">No lines yet. Add the first line.</td></tr>}
          </tbody>
          {ed.grp && (
            <tfoot>
              <tr><td colSpan={5}>Material cost per unit</td><td className="num">{inr(total)}</td><td></td></tr>
            </tfoot>
          )}
        </table>
      </div>
      <div style={{ marginTop: 10 }}><button type="button" className="btn sm" onClick={add}>+ Add line</button></div>
    </>
  );
}

/** Re-run material planning after stock or indents change, if a result is on screen. */
export const refreshMrp = () => {
  if (UI.mrpRun && UI.mrpSel) UI.mrpRun = mrp([...UI.mrpSel]);
};

/** Keyed form values for modals with many quantity inputs. */
export const numOf = (v: string | number | undefined) => {
  const x = typeof v === "number" ? v : parseFloat(v ?? "");
  return isNaN(x) ? 0 : x;
};
