// Engineering: product master, combo sets (parent–child items), bill of materials and raw material master.
import { useEffect, useState } from "react";
import {
  BOM, BOMREV, CATS, CAT_VAR, CHILD_ITEMS, COMBOS, DENS, FAMILIES, FG, G, LEAD_BY_CAT, RM, SESSION, UOMS, USERS, VEN_BY_CAT,
  bomCost, bomVer, fgBy, hsnOf, kindLabel, mk, parseAlt, rmBy, stockMove, stockStatus, whereUsed,
} from "@/erp/engine";
import { TODAY, ds, inr, inrShort, qfmt } from "@/erp/format";
import { UI, canEdit, canSee, setUI } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { go } from "@/erp/nav";
import { Field, Modal, PageHead, Pill, SampleNote, Seg, closeModal, openModal, toast } from "../ui";
import { Icon } from "../Icon";
import { LineEditor, allow, edValid, numOf, refreshMrp, type Ed } from "./proc";
import { StockCard } from "./Stores";

/* ================= Product master ================= */
export function ProductsPage() {
  useErp();
  const fams = ["all", ...new Set(FG.map((f: any) => f.family))] as string[];
  const list = FG.filter((f: any) => UI.fgFilter === "all" || f.family === UI.fgFilter);
  return (
    <>
      <PageHead route="products" title="Product master" desc="Finished goods: Mechtek machines and change parts. Specifications of the website products are as published on mechtek.in."
        actions={[<button key="n" className="btn primary" onClick={() => allow("products") && openModal(<FgModal />)}>Add product</button>]} />
      <div className="toolbar">
        <Seg label="Filter by family" value={UI.fgFilter} onChange={(v) => setUI({ fgFilter: v })} options={fams.map((f) => [f, f === "all" ? "All" : f] as [string, string])} />
      </div>
      <div className="grid-3">
        {list.map((f: any) => {
          const v = bomVer(f.code);
          return (
            <article key={f.code} className="card fg-card">
              <div className="fg-top">
                <div>
                  <div className="mono muted">{f.code}{v ? ` · BOM v${v.ver}` : <> · <span style={{ color: "var(--warn)" }}>No BOM</span></>}</div>
                  <h3>{f.name}</h3>
                  <div className="small muted">{f.family} · {f.sub}</div>
                </div>
                <Pill t={f.kind === "machine" ? "Configure to order" : "Engineer to order"} c={f.kind === "machine" ? "info" : ""} />
              </div>
              {f.flag && <div className="sample-note small"><b>Note</b><span>{f.flag}</span></div>}
              <dl className="spec-list">
                {f.specs.map((s: any, i: number) => <div key={i} style={{ display: "contents" }}><dt>{s[0]}</dt><dd>{s[1]}</dd></div>)}
              </dl>
              <div className="fg-foot">
                <div><div className="small muted">List price (sample)</div><div className="cell-title num" style={{ textAlign: "left" }}>{inr(f.price)}</div></div>
                <div className="actions">
                  <a className="btn sm ghost" href={f.url} target="_blank" rel="noopener">Website</a>
                  {canEdit("products") && <button className="btn sm" onClick={() => openModal(<FgModal code={f.code} />)}>Edit</button>}
                  <button className="btn sm" onClick={() => { UI.bomItem = f.code; go("bom"); }}>{(BOM[f.code] || []).length ? "View BOM" : "Create BOM"}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function FgModal({ code }: { code?: string }) {
  const f = code ? fgBy[code] : null;
  const fams = [...new Set([...FAMILIES, ...FG.map((x: any) => x.family)])] as string[];
  const [v, setV] = useState({
    code: f ? f.code : "FG-", name: f?.name || "", fam: f?.family || "", sub: f?.sub || "", kind: f?.kind || "machine",
    hsn: f ? hsnOf(f.code) : "8422 40 00", price: f ? String(f.price) : "", url: f?.url || "https://mechtek.in/",
    specs: f ? f.specs.map((s: any) => s[0] + ": " + s[1]).join("\n") : "",
  });
  const [e, setE] = useState<Record<string, string>>({});
  const set = (k: keyof typeof v) => (x: any) => setV({ ...v, [k]: x.target.value });
  const save = () => {
    if (!allow("products")) return;
    const c = f ? f.code : v.code.trim().toUpperCase(), name = v.name.trim(), fam = v.fam.trim(), price = parseFloat(v.price);
    const errs: Record<string, string> = {};
    if (!f) {
      const ce = !/^[A-Z0-9][A-Z0-9-]{2,14}$/.test(c) ? "3 to 15 characters: capital letters, numbers and hyphens." : fgBy[c] ? "This product code already exists." : "";
      if (ce) errs.code = ce;
    }
    if (!name) errs.name = "Enter the product name.";
    if (!fam) errs.fam = "Enter or pick a product family.";
    if (!(price > 0)) errs.price = "Enter a list price above zero.";
    setE(errs);
    if (Object.keys(errs).length) return;
    const specs = String(v.specs).split("\n").map((x: string) => x.trim()).filter(Boolean).map((x: string) => { const k = x.indexOf(":"); return k > 0 ? [x.slice(0, k).trim(), x.slice(k + 1).trim()] : ["Note", x]; });
    const data = { hsn: v.hsn.trim(), name, family: fam, sub: v.sub.trim() || "Standard", kind: v.kind, price, url: v.url.trim() || "https://mechtek.in/", specs: specs.length ? specs : [["Specs", "To be added"]] };
    if (f) { Object.assign(f, data); closeModal(); bump(); toast(`${name} saved`); }
    else {
      const n = { code: c, ...data };
      FG.push(n); fgBy[c] = n;
      UI.bomItem = c; UI.bomEd = null;
      closeModal(); go("bom"); bump(); toast(`${name} added. Now create its bill of materials.`);
    }
  };
  return (
    <Modal wide title={f ? `Edit product · ${f.name}` : "Add finished good"}
      foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>{f ? "Save product" : "Add product and create BOM"}</button></>}>
      <div className="form-grid">
        <Field id="fg-code" label="Product code *" err={e.code}><input className={`input mono ${e.code ? "invalid" : ""}`} id="fg-code" value={v.code} onChange={set("code")} disabled={!!f} /></Field>
        <Field id="fg-name" label="Product name *" err={e.name}><input className={`input ${e.name ? "invalid" : ""}`} id="fg-name" value={v.name} onChange={set("name")} placeholder="e.g. EB-200" /></Field>
        <Field id="fg-fam" label="Family *" err={e.fam}>
          <input className={`input ${e.fam ? "invalid" : ""}`} id="fg-fam" list="fam-list" value={v.fam} onChange={set("fam")} />
          <datalist id="fam-list">{fams.map((x) => <option key={x} value={x} />)}</datalist>
        </Field>
        <Field id="fg-sub" label="Model type"><input className="input" id="fg-sub" value={v.sub} onChange={set("sub")} placeholder="e.g. Pilot batch" /></Field>
        <Field id="fg-kind" label="Order type">
          <select className="input" id="fg-kind" value={v.kind} onChange={set("kind")}>
            <option value="machine">Machine: configure to order</option><option value="part">Change part: engineer to order</option>
          </select>
        </Field>
        <Field id="fg-hsn" label="HSN code"><input className="input mono" id="fg-hsn" value={v.hsn} onChange={set("hsn")} /></Field>
        <Field id="fg-price" label="List price (₹) *" err={e.price}><input className={`input num ${e.price ? "invalid" : ""}`} id="fg-price" type="number" min={0} value={v.price} onChange={set("price")} /></Field>
        <Field id="fg-url" label="Web page" span><input className="input" id="fg-url" value={v.url} onChange={set("url")} /></Field>
        <Field id="fg-specs" label="Specifications (one per line, as Label: value)" span>
          <textarea className="input" id="fg-specs" rows={6} value={v.specs} onChange={set("specs")} placeholder={"Output: 15–25 cycles/min\nPower: 380 V, 50 Hz"} />
        </Field>
      </div>
      {!f && <p className="small muted">After saving, you will go to the BOM screen to create this product's bill of materials.</p>}
    </Modal>
  );
}

/* ================= Combo sets ================= */
const comboParents = () => FG.filter((f: any) => f.kind === "machine" || f.kind === "part");
const childPool = (parent: string) => [...CHILD_ITEMS, ...FG.filter((f: any) => f.code !== parent)];

export function CombosPage() {
  useErp();
  const tab = UI.cbTab;
  const ed = canEdit("combos");
  const head = (
    <>
      <PageHead route="combos" title="Combo sets" desc="Parent–child sets: pick a main item and map the child items that go with it. Standard scope is pre-ticked on the quotation; optional items are offered as add-ons."
        actions={ed ? [<button key="c" className="btn" onClick={() => allow("combos") && openModal(<ChildItemModal />)}>Add child item</button>] : undefined} />
      <div className="toolbar">
        <Seg value={tab} onChange={(v) => setUI({ cbTab: v, cbEdit: null })} options={[["sets", "Combo sets"], ["items", `Child item master (${CHILD_ITEMS.length})`]]} />
      </div>
    </>
  );
  if (tab === "items")
    return (
      <>
        {head}
        <section className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Code</th><th>Child item</th><th>Type</th><th>Source</th><th>HSN / SAC</th><th className="num">List price</th><th>Used in</th><th></th></tr></thead>
              <tbody>
                {CHILD_ITEMS.map((c: any) => {
                  const used = Object.keys(COMBOS).filter((p) => COMBOS[p].lines.some((l: any) => l.item === c.code));
                  return (
                    <tr key={c.code}>
                      <td className="mono nowrap">{c.code}</td>
                      <td style={{ minWidth: 220 }}><div className="cell-title">{c.name}</div><div className="cell-sub">{c.sub || ""}</div></td>
                      <td>{kindLabel(c.code)}</td><td className="small">{c.src || ""}</td><td className="mono small nowrap">{c.hsn || ""}</td>
                      <td className="num">{inr(c.price)}</td>
                      <td className="small" style={{ minWidth: 140 }}>{used.length ? used.map((p) => fgBy[p].name).join(", ") : <span className="muted">Not mapped</span>}</td>
                      <td>{ed && <button className="btn sm" onClick={() => openModal(<ChildItemModal code={c.code} />)}>Edit</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <p className="small muted">HSN and SAC codes are sample values. Confirm them with your tax consultant before invoicing.</p>
      </>
    );
  const sel = fgBy[UI.cbSel] && comboParents().some((f: any) => f.code === UI.cbSel) ? UI.cbSel : "FG-EB160";
  const f = fgBy[sel];
  const c = COMBOS[sel];
  const editing = UI.cbEdit && UI.cbEdit.parent === sel;
  const pick = (code: string) => {
    if (UI.cbEdit) return toast("Save or cancel the changes to this combo set first.", true);
    setUI({ cbSel: code, cbEdit: null });
  };
  let body;
  if (editing) body = <ComboEditor />;
  else if (!c || !c.lines.length) body = <div className="empty">No combo set for {f.name} yet.{ed && <> Choose <b>Create combo set</b> to map its child items.</>}</div>;
  else {
    const std = c.lines.filter((l: any) => l.std), opt = c.lines.filter((l: any) => !l.std);
    const inclV = c.lines.filter((l: any) => l.incl).reduce((s: number, l: any) => s + fgBy[l.item].price * l.qty, 0);
    const optV = opt.reduce((s: number, l: any) => s + (l.incl ? 0 : fgBy[l.item].price * l.qty), 0);
    const tbl = (title: string, arr: any[]) =>
      arr.length ? (
        <>
          <h3 className="cb-sub">{title}</h3>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Child item</th><th>Type</th><th className="num">Qty per main</th><th className="num">Price</th><th>Note</th></tr></thead>
              <tbody>
                {arr.map((l: any) => {
                  const x = fgBy[l.item];
                  return (
                    <tr key={l.item}>
                      <td style={{ minWidth: 220 }}><div className="cell-title">{x.name}</div><div className="cell-sub mono">{x.code}</div></td>
                      <td className="small">{kindLabel(l.item)}{mk(l) && <div className="cell-sub">Work order</div>}</td>
                      <td className="num">{l.qty}</td>
                      <td className="num nowrap">{l.incl ? <Pill t="Included" c="ok" /> : inr(x.price)}</td>
                      <td className="small">{l.note || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null;
    body = (
      <>
        <div className="kpis cb-kpis">
          <div className="kpi"><span className="k-label">Main item price</span><span className="k-value">{inr(f.price)}</span><span className="k-foot">{f.family}</span></div>
          <div className="kpi"><span className="k-label">Included in price</span><span className="k-value">{inr(inclV)}</span><span className="k-foot">{c.lines.filter((l: any) => l.incl).length} items at list value</span></div>
          <div className="kpi"><span className="k-label">Optional add-ons</span><span className="k-value">{inr(optV)}</span><span className="k-foot">{opt.length} items if all taken</span></div>
        </div>
        {tbl("Standard scope (pre-ticked on the quotation)", std)}
        {tbl("Optional add-ons (offered on the quotation)", opt)}
        <details className="cb-hist">
          <summary className="small">Revision {c.rev} · history</summary>
          {c.hist.slice().reverse().map((h: any, i: number) => (
            <div key={i} className="small" style={{ marginTop: 6 }}><b>{ds(h.at)}</b> · {USERS[h.by] ? USERS[h.by].name : h.by} · {h.note}</div>
          ))}
        </details>
      </>
    );
  }
  const acts = editing ? (
    <><button className="btn" onClick={() => setUI({ cbEdit: null })}>Cancel</button><button className="btn primary" onClick={saveCombo}>Save combo set</button></>
  ) : ed ? (
    <button className="btn primary" onClick={() => { if (allow("combos")) setUI({ cbEdit: { parent: sel, lines: c ? c.lines.map((l: any) => ({ ...l })) : [], note: "", err: "" } }); }}>
      {c && c.lines.length ? "Edit combo set" : "Create combo set"}
    </button>
  ) : null;
  return (
    <>
      {head}
      <div className="cb-wrap">
        <nav className="card cb-list" aria-label="Main items">
          {([["Machines", "machine"], ["Change parts", "part"]] as const).map(([g, k]) => (
            <div key={k} style={{ display: "contents" }}>
              <div className="cb-grp">{g}</div>
              {comboParents().filter((x: any) => x.kind === k).map((x: any) => {
                const n = COMBOS[x.code] ? COMBOS[x.code].lines.length : 0;
                return (
                  <button key={x.code} className="cb-item" onClick={() => pick(x.code)} aria-current={x.code === sel}>
                    <span>{x.name}</span>
                    <span className={`small nowrap ${n ? "muted" : ""}`} style={n ? undefined : { color: "var(--warn)" }}>{n ? n + " items" : "No set"}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <label className="cb-picker">
          <span className="small muted">Main item</span>
          <select className="input" value={sel} onChange={(e) => setUI({ cbSel: e.target.value, cbEdit: null })}>
            {comboParents().map((x: any) => <option key={x.code} value={x.code}>{x.name}</option>)}
          </select>
        </label>
        <section className="card">
          <div className="card-head">
            <div><h2>{f.name}</h2><div className="small muted">{f.family} · {f.sub} · <span className="mono">{f.code}</span></div></div>
            <div className="actions">{acts}</div>
          </div>
          <div className="card-body">{body}</div>
        </section>
      </div>
    </>
  );
}

function saveCombo() {
  if (!allow("combos")) return;
  const e = UI.cbEdit;
  const seen = new Set<string>();
  for (const [i, l] of e.lines.entries()) {
    if (!l.item) return setUI({ cbEdit: { ...e, err: `Line ${i + 1}: pick a child item.` } });
    if (seen.has(l.item)) return setUI({ cbEdit: { ...e, err: `${fgBy[l.item].name} is listed twice. Keep one line and set its quantity.` } });
    if (!(l.qty > 0)) return setUI({ cbEdit: { ...e, err: `Line ${i + 1}: quantity must be at least 1.` } });
    seen.add(l.item);
  }
  const note = (e.note || "").trim() || "Combo set updated.";
  const lines = e.lines.map((l: any) => ({ item: l.item, qty: l.qty, std: l.std, incl: l.incl, note: l.note || "" }));
  const c = COMBOS[e.parent];
  if (c) { c.lines = lines; c.rev++; c.hist.push({ at: new Date(TODAY), by: SESSION.user, note }); }
  else COMBOS[e.parent] = { rev: 1, lines, hist: [{ at: new Date(TODAY), by: SESSION.user, note }] };
  setUI({ cbEdit: null });
  toast(`Combo set for ${fgBy[e.parent].name} saved (revision ${COMBOS[e.parent].rev})`);
}

function ComboEditor() {
  const e = UI.cbEdit;
  const pool = childPool(e.parent);
  const [copyFrom, setCopyFrom] = useState("");
  const upd = (patch: any) => setUI({ cbEdit: { ...e, ...patch } });
  const setLine = (i: number, patch: any) => upd({ lines: e.lines.map((l: any, j: number) => (j === i ? { ...l, ...patch } : l)) });
  const groups: [string, any[]][] = [
    ["Spares", pool.filter((x: any) => x.kind === "spare")],
    ["Accessories", pool.filter((x: any) => x.kind === "accessory" || x.family === "Accessory")],
    ["Services and documents", pool.filter((x: any) => x.kind === "service" || x.kind === "doc")],
    ["Change parts", pool.filter((x: any) => x.kind === "part")],
    ["Machines", pool.filter((x: any) => x.kind === "machine" && x.family !== "Accessory")],
  ];
  const copy = () => {
    if (!copyFrom) return toast("Choose a main item to copy from.", true);
    const have = new Set(e.lines.map((l: any) => l.item));
    const add = COMBOS[copyFrom].lines.filter((l: any) => l.item !== e.parent && !have.has(l.item)).map((l: any) => ({ ...l }));
    upd({ lines: [...e.lines, ...add] });
    toast(`${add.length} line${add.length === 1 ? "" : "s"} copied from ${fgBy[copyFrom].name}`);
  };
  return (
    <>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Child item</th><th>Scope</th><th>Price</th><th className="num">Qty per main item</th><th>Note on quotation</th><th></th></tr></thead>
          <tbody>
            {e.lines.map((l: any, i: number) => (
              <tr key={i}>
                <td style={{ minWidth: 220 }}>
                  <select className="input" value={l.item} onChange={(x) => setLine(i, { item: x.target.value })} aria-label={`Child item ${i + 1}`}>
                    <option value="">Pick an item…</option>
                    {groups.map(([g, a]) => a.length ? <optgroup key={g} label={g}>{a.map((x: any) => <option key={x.code} value={x.code}>{x.name}</option>)}</optgroup> : null)}
                  </select>
                </td>
                <td style={{ minWidth: 130 }}>
                  <select className="input" value={l.std ? "1" : "0"} onChange={(x) => setLine(i, { std: x.target.value === "1" })} aria-label="Scope">
                    <option value="1">Standard</option><option value="0">Optional</option>
                  </select>
                </td>
                <td style={{ minWidth: 170 }}>
                  <select className="input" value={l.incl ? "1" : "0"} onChange={(x) => setLine(i, { incl: x.target.value === "1" })} aria-label="Price basis">
                    <option value="1">Included in main price</option>
                    <option value="0">Charged at list{l.item && fgBy[l.item] ? " " + inr(fgBy[l.item].price) : ""}</option>
                  </select>
                </td>
                <td className="num"><input className="input num" type="number" min={1} step={1} value={l.qty} onChange={(x) => setLine(i, { qty: Math.max(0, +x.target.value || 0) })} style={{ width: 80 }} aria-label="Quantity per main item" /></td>
                <td style={{ minWidth: 180 }}><input className="input" value={l.note || ""} onChange={(x) => setLine(i, { note: x.target.value })} placeholder="Optional" aria-label="Note" /></td>
                <td><button className="btn sm ghost" onClick={() => upd({ lines: e.lines.filter((_: any, j: number) => j !== i) })} aria-label="Remove line" style={{ color: "var(--bad)" }}>Remove</button></td>
              </tr>
            ))}
            {!e.lines.length && <tr><td colSpan={6} className="empty">No child items yet. Add one below.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="toolbar" style={{ marginTop: 10 }}>
        <button className="btn sm" onClick={() => upd({ lines: [...e.lines, { item: "", qty: 1, std: false, incl: false, note: "" }] })}>Add child item</button>
        <label htmlFor="cb-copy-from" className="small muted" style={{ alignSelf: "center" }}>Copy lines from</label>
        <select className="input" id="cb-copy-from" value={copyFrom} onChange={(x) => setCopyFrom(x.target.value)} style={{ width: "auto", minWidth: 0, maxWidth: 220 }}>
          <option value="">Choose a main item…</option>
          {comboParents().filter((f: any) => f.code !== e.parent && COMBOS[f.code]).map((f: any) => <option key={f.code} value={f.code}>{f.name}</option>)}
        </select>
        <button className="btn sm" onClick={copy}>Copy</button>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="cb-note">Reason for change (kept in the history)</label>
        <input className="input" id="cb-note" value={e.note || ""} onChange={(x) => upd({ note: x.target.value })} placeholder="e.g. Chiller added as standard for export orders" />
      </div>
      {e.err && <p className="small" role="alert" style={{ color: "var(--bad)" }}>{e.err}</p>}
    </>
  );
}

function ChildItemModal({ code }: { code?: string }) {
  const c = code ? fgBy[code] : null;
  const [v, setV] = useState({ code: c?.code || "", name: c?.name || "", kind: c?.kind || "spare", src: c?.src || "Bought-out", price: c ? String(c.price) : "", hsn: c?.hsn || "", sub: c?.sub || "" });
  const [e, setE] = useState<Record<string, string>>({});
  const set = (k: keyof typeof v) => (x: any) => setV({ ...v, [k]: x.target.value });
  const save = () => {
    if (!allow("combos")) return;
    const cd = code || v.code.trim().toUpperCase(), name = v.name.trim(), price = +v.price;
    const errs: Record<string, string> = {};
    if (!cd) errs.code = "Enter a code."; else if (!code && fgBy[cd]) errs.code = "This code is already used.";
    if (!name) errs.name = "Enter a name.";
    if (!(v.price !== "" && price >= 0)) errs.price = "Enter the list price.";
    setE(errs);
    if (Object.keys(errs).length) return;
    const fam: Record<string, string> = { spare: "Spares", accessory: "Accessories", service: "Services", doc: "Documents" };
    const rec = { code: cd, name, kind: v.kind, family: fam[v.kind], src: v.src, price, hsn: v.hsn.trim(), sub: v.sub.trim(), specs: [], url: "" };
    if (code) Object.assign(fgBy[code], rec);
    else { CHILD_ITEMS.push(rec); fgBy[cd] = rec; }
    UI.cbTab = "items";
    closeModal(); go("combos"); bump(); toast(`${cd} saved`);
  };
  return (
    <Modal title={c ? `Edit child item ${c.code}` : "Add child item"} foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>Save child item</button></>}>
      <div className="form-grid">
        <Field id="ci-code" label="Code *" err={e.code}><input className={`input mono ${e.code ? "invalid" : ""}`} id="ci-code" value={v.code} onChange={set("code")} readOnly={!!c} placeholder="e.g. AC-PRINT" /></Field>
        <Field id="ci-name" label="Name *" err={e.name}><input className={`input ${e.name ? "invalid" : ""}`} id="ci-name" value={v.name} onChange={set("name")} /></Field>
        <Field id="ci-kind" label="Type">
          <select className="input" id="ci-kind" value={v.kind} onChange={set("kind")}>
            {[["spare", "Spares"], ["accessory", "Accessory"], ["service", "Service"], ["doc", "Document"]].map(([a, b]) => <option key={a} value={a}>{b}</option>)}
          </select>
        </Field>
        <Field id="ci-src" label="Source">
          <select className="input" id="ci-src" value={v.src} onChange={set("src")}>
            {["Bought-out", "Built with the machine", "Made with the change parts", "Service"].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field id="ci-price" label="List price (₹) *" err={e.price}><input className={`input num ${e.price ? "invalid" : ""}`} id="ci-price" type="number" min={0} value={v.price} onChange={set("price")} /></Field>
        <Field id="ci-hsn" label="HSN / SAC"><input className="input mono" id="ci-hsn" value={v.hsn} onChange={set("hsn")} placeholder="8422 90 90 or SAC 998732" /></Field>
      </div>
      <Field id="ci-sub" label="Description"><input className="input" id="ci-sub" value={v.sub} onChange={set("sub")} placeholder="What is included" /></Field>
    </Modal>
  );
}

/* ================= Bill of materials ================= */
export function BomPage() {
  useErp();
  useEffect(() => () => { UI.bomEd = null; }, []);
  const f = fgBy[UI.bomItem] || FG[0];
  const lines = BOM[f.code] || [];
  const ver = bomVer(f.code);
  const editing = UI.bomEd && UI.bomEd.code === f.code;
  const sel = (
    <div key="sel" style={{ display: "contents" }}>
      <label className="small muted" htmlFor="bom-sel" style={{ alignSelf: "center" }}>Finished good</label>
      <select className="input" id="bom-sel" value={f.code} onChange={(e) => setUI({ bomItem: e.target.value })} style={{ width: "auto", minWidth: 0, maxWidth: "100%" }} disabled={!!UI.bomEd}>
        {FG.map((x: any) => <option key={x.code} value={x.code}>{x.name} ({x.code})</option>)}
      </select>
    </div>
  );
  const helpBtn = (
    <button key="h" className="btn ghost" onClick={() => { UI.helpAnchor = "help-bom"; go("help"); }}>
      <Icon name="help" style={{ width: 18, height: 18 }} /> How to create a BOM
    </button>
  );
  const startEdit = () => {
    if (!allow("bom")) return;
    const ls = (BOM[f.code] || []).map((l: any) => ({ grp: l[0], rm: l[1], qty: l[2] }));
    setUI({ bomEd: { code: f.code, ed: { grp: true, uom: false, lines: ls.length ? ls : [{ grp: G.F, rm: "", qty: "" }] }, note: "", err: "", copy: "" } });
  };
  if (editing) return <BomEditor f={f} ver={ver} helpBtn={helpBtn} />;
  if (!lines.length)
    return (
      <>
        <PageHead route="bom" title="Bill of materials" desc="Single-level BOM by sub-assembly, with raw-material cost analysis." actions={[sel, helpBtn]} />
        <section className="card">
          <div className="empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 16px" }}>
            <h2 style={{ fontSize: 17 }}>{f.name} has no bill of materials yet</h2>
            <p className="muted" style={{ maxWidth: "52ch" }}>Add the raw materials needed to make one unit, grouped by sub-assembly, or copy the BOM of a similar product and adjust it.</p>
            <div className="actions" style={{ justifyContent: "center" }}>
              {canEdit("bom") && <button className="btn primary" onClick={startEdit}>Create BOM</button>}
              <button className="btn" onClick={() => { UI.helpAnchor = "help-bom"; go("help"); }}>Read: how to create a BOM</button>
            </div>
          </div>
        </section>
      </>
    );
  const total = bomCost(f.code);
  const groups = [...new Set(lines.map((l: any) => l[0]))] as string[];
  const catCost = CATS.map((_: any, i: number) => lines.filter((l: any) => rmBy[l[1]].cat === i).reduce((s: number, l: any) => s + l[2] * rmBy[l[1]].rate, 0));
  const top = lines.map((l: any) => ({ l, amt: l[2] * rmBy[l[1]].rate })).sort((a: any, b: any) => b.amt - a.amt).slice(0, 5);
  const wt = lines.filter((l: any) => rmBy[l[1]].uom === "kg" && rmBy[l[1]].cat < 2).reduce((s: number, l: any) => s + l[2], 0);
  const matPct = (total / f.price) * 100;
  const wSpec = f.specs.find((s: any) => /weight/i.test(s[0]));
  const revs = BOMREV[f.code] || [];
  return (
    <>
      <PageHead route="bom" title="Bill of materials" desc="Single-level BOM by sub-assembly, with raw-material cost analysis."
        actions={[sel, helpBtn, ...(canEdit("bom") ? [<button key="e" className="btn primary" onClick={startEdit}>Edit BOM</button>] : [])]} />
      {ver && (
        <div className="banner" style={{ background: "var(--surface)" }}>
          <span><b>Version {ver.ver}</b> · {USERS[ver.by].name} · {ds(ver.at)} · {ver.note}</span>
          {revs.length > 1 && <span className="small muted">{revs.length} versions: {revs.slice().reverse().map((v: any) => "v" + v.ver + " " + ds(v.at)).join(" · ")}</span>}
        </div>
      )}
      <SampleNote>Quantities are Selvantra estimates derived from the published specs (power, drive, stations, weight). Rates are sample figures. Both are to be validated with Mechtek engineering and purchase.</SampleNote>
      <div className="kpis">
        <div className="kpi"><span className="k-label">Material cost per unit</span><span className="k-value">{inr(total)}</span><span className="k-foot">{lines.length} BOM lines, {groups.length} sub-assemblies</span></div>
        <div className="kpi"><span className="k-label">Material share of list price</span><span className="k-value">{matPct.toFixed(1)}%</span><span className="k-foot">List price {inr(f.price)} (sample)</span></div>
        <div className="kpi"><span className="k-label">Metal content (kg)</span><span className="k-value">{qfmt(wt)}</span><span className="k-foot">{wSpec ? "Published weight: " + wSpec[1] : "Sheet, structure and bar stock"}</span></div>
        <div className="kpi"><span className="k-label">Items short for 1 unit</span><span className="k-value">{lines.filter((l: any) => !rmBy[l[1]].service && rmBy[l[1]].onHand < l[2]).length}</span><span className="k-foot">against current stock</span></div>
      </div>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Cost by material category</h2></div>
          <div className="card-body">
            <div className="stack" role="img" aria-label="Material cost split by category">
              {catCost.map((c: number, i: number) => c > 0 ? <span key={i} style={{ width: `${((c / total) * 100).toFixed(2)}%`, background: `var(${CAT_VAR[i]})` }} title={CATS[i]} /> : null)}
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="data">
                <tbody>
                  {catCost.map((c: number, i: number) => c > 0 ? (
                    <tr key={i}>
                      <td><span className="legend" style={{ margin: 0 }}><span><i style={{ background: `var(${CAT_VAR[i]})` }} />{CATS[i]}</span></span></td>
                      <td className="num">{inr(c)}</td><td className="num muted">{((c / total) * 100).toFixed(1)}%</td>
                    </tr>
                  ) : null)}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><h2>Top five cost drivers</h2></div>
          <div className="card-body">
            <div className="hbar-list">
              {top.map((t: any, i: number) => (
                <div key={i} className="hbar">
                  <span className="lbl" title={rmBy[t.l[1]].name}>{rmBy[t.l[1]].name}</span>
                  <div className="track"><div className="fill" style={{ width: `${((t.amt / top[0].amt) * 100).toFixed(1)}%` }} /></div>
                  <span className="val">{inr(t.amt)}</span>
                </div>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>
              {f.name}: {f.family}, {f.sub}. {f.kind === "part" ? "Change-part sets are machined per customer drawing; anodising and heat treatment are outsourced." : "Controls, drives and stainless steel make up most of the cost."}
            </p>
          </div>
        </section>
      </div>
      <section className="card">
        <div className="card-head"><h2>{f.name} · BOM lines</h2><span className="small muted">Per 1 unit</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>RM code</th><th>Description</th><th>Category</th><th className="num">Qty</th><th>UoM</th><th className="num">Rate</th><th className="num">Amount</th><th>Stock</th></tr></thead>
            <tbody>
              {groups.map((g) => {
                const gl = lines.filter((l: any) => l[0] === g);
                const gs = gl.reduce((s: number, l: any) => s + l[2] * rmBy[l[1]].rate, 0);
                return [
                  <tr key={g} className="group"><td colSpan={6}>{g}</td><td className="num">{inr(gs)}</td><td></td></tr>,
                  ...gl.map((l: any) => {
                    const r = rmBy[l[1]];
                    const ok = r.service || r.onHand >= l[2];
                    return (
                      <tr key={g + l[1]}>
                        <td className="mono">{r.code}</td><td>{r.name}</td><td className="muted small">{CATS[r.cat]}</td><td className="num">{qfmt(l[2])}</td><td>{r.uom}</td>
                        <td className="num">{inr(r.rate)}</td><td className="num">{inr(l[2] * r.rate)}</td>
                        <td>{r.service ? <Pill t="Job work" /> : ok ? <Pill t="Available" c="ok" /> : <Pill t="Short" c="bad" />}</td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
            <tfoot><tr><td colSpan={6}>Total material cost</td><td className="num">{inr(total)}</td><td></td></tr></tfoot>
          </table>
        </div>
      </section>
    </>
  );
}

function BomEditor({ f, ver, helpBtn }: { f: any; ver: any; helpBtn: any }) {
  const b = UI.bomEd;
  const others = FG.filter((x: any) => x.code !== f.code && (BOM[x.code] || []).length);
  const upd = (patch: any) => setUI({ bomEd: { ...b, ...patch } });
  const copy = () => {
    if (!b.copy) return;
    const ls = (BOM[b.copy] || []).map((l: any) => ({ grp: l[0], rm: l[1], qty: l[2] }));
    upd({ ed: { ...b.ed, lines: ls } });
    toast(`${ls.length} lines copied from ${fgBy[b.copy].name}. Adjust quantities, then save.`);
  };
  const save = () => {
    if (!allow("bom")) return;
    const err = edValid(b.ed);
    if (err) return upd({ err });
    const code = b.code;
    BOM[code] = b.ed.lines.filter((l: any) => l.rm).map((l: any) => [l.grp.trim(), l.rm, Number(l.qty)]);
    const prev = bomVer(code);
    const note = (b.note || "").trim();
    (BOMREV[code] = BOMREV[code] || []).push({ ver: prev ? prev.ver + 1 : 1, at: new Date(TODAY), by: SESSION.user, note: note || (prev ? "Revised" : "First release"), n: BOM[code].length });
    refreshMrp();
    setUI({ bomEd: null });
    toast(`BOM for ${fgBy[code].name} saved as version ${bomVer(code).ver}`);
  };
  const nv = ver ? ver.ver + 1 : 1;
  return (
    <>
      <PageHead route="bom" title={`${ver ? "Edit" : "Create"} BOM · ${f.name}`} desc={`Enter the raw materials needed to make one ${f.name}, grouped by sub-assembly. Saving creates version ${nv}.`} actions={[helpBtn]} />
      <section className="card">
        <div className="card-head"><h2>Start from a similar product</h2><span className="small muted">Optional: replaces the lines below</span></div>
        <div className="card-body toolbar">
          <label htmlFor="bom-copy-src" style={{ position: "absolute", left: -9999 }}>Copy lines from</label>
          <select className="input" id="bom-copy-src" value={b.copy || ""} onChange={(e) => upd({ copy: e.target.value })}>
            <option value="">Copy lines from…</option>
            {others.map((x: any) => <option key={x.code} value={x.code}>{x.name} ({(BOM[x.code] || []).length} lines)</option>)}
          </select>
          <button className="btn" onClick={copy}>Copy lines</button>
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h2>BOM lines · per 1 unit</h2><span className="small muted">Rates and stock from the raw material master</span></div>
        <div className="card-body">
          <LineEditor ed={b.ed as Ed} onChange={(ed) => upd({ ed })} />
          {b.err && <p className="small" role="alert" style={{ color: "var(--bad)", marginTop: 8 }}>{b.err}</p>}
        </div>
      </section>
      <section className="card">
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label htmlFor="bom-note">What changed in this version?</label>
            <input className="input" id="bom-note" value={b.note || ""} onChange={(e) => upd({ note: e.target.value })} placeholder={ver ? "e.g. Servo motor replaced by 1.5 kW model" : "e.g. First release"} />
          </div>
          <div className="actions" style={{ justifyContent: "flex-end" }}>
            <button className="btn" onClick={() => setUI({ bomEd: null })}>Cancel</button>
            <button className="btn primary" onClick={save}>Save BOM as version {nv}</button>
          </div>
        </div>
      </section>
    </>
  );
}

/* ================= Raw material master ================= */
export function MaterialsPage() {
  useErp();
  const q = (UI.rmSearch || "").trim().toLowerCase();
  const list = RM.filter((r: any) => (UI.rmFilter === "all" || String(r.cat) === UI.rmFilter) && (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)));
  const low = RM.filter((r: any) => !r.service && r.onHand < r.reorder).length;
  const val = RM.reduce((s: number, r: any) => s + r.onHand * r.rate, 0);
  return (
    <>
      <PageHead route="materials" title="Raw material master" desc="Materials used across Mechtek products, with stock, reorder levels and where each is used."
        actions={[<button key="n" className="btn primary" onClick={() => allow("materials") && openModal(<RmModal />)}>Add material</button>]} />
      <div className="kpis">
        <div className="kpi"><span className="k-label">Raw material items</span><span className="k-value">{RM.length}</span><span className="k-foot">{CATS.length} categories</span></div>
        <div className="kpi"><span className="k-label">Stock value</span><span className="k-value">{inrShort(val)}</span><span className="k-foot">at sample rates</span></div>
        <div className={`kpi ${low ? "warn" : ""}`}><span className="k-label">Below reorder level</span><span className="k-value">{low}</span><span className="k-foot">items to replenish</span></div>
      </div>
      <div className="toolbar">
        <label htmlFor="rm-cat" style={{ position: "absolute", left: -9999 }}>Category</label>
        <select className="input" id="rm-cat" value={UI.rmFilter} onChange={(e) => setUI({ rmFilter: e.target.value })}>
          <option value="all">All categories</option>
          {CATS.map((c: string, i: number) => <option key={i} value={String(i)}>{c}</option>)}
        </select>
      </div>
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Code</th><th>Description</th><th>Category</th><th>Units</th><th className="num">On hand</th><th className="num">Reorder level</th><th className="num">Rate</th><th>Used in</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((r: any) => {
                const st = stockStatus(r);
                const wu = whereUsed(r.code);
                return (
                  <tr key={r.code}>
                    <td className="mono">{r.code}</td><td>{r.name}</td><td className="small muted">{CATS[r.cat]}</td>
                    <td className="small" style={{ minWidth: 150 }}><b>{r.uom}</b>{(r.alt || []).map((a: any) => <div key={a.u} className="cell-sub">1 {a.u} = {qfmt(a.f)} {r.uom}</div>)}</td>
                    <td className="num">{r.service ? "—" : qfmt(r.onHand)}</td><td className="num">{r.service ? "—" : qfmt(r.reorder)}</td><td className="num">{inr(r.rate)}</td>
                    <td className="small" title={wu.map((c: string) => fgBy[c].name).join(", ")}>{wu.length} product{wu.length === 1 ? "" : "s"}</td>
                    <td><Pill t={st.t} c={st.c} /></td>
                    <td className="nowrap">
                      {!r.service && canSee("inventory") && <button className="btn sm ghost" onClick={() => openModal(<StockCard code={r.code} />)}>Stock card</button>}
                      {canEdit("materials") && <button className="btn sm" onClick={() => openModal(<RmModal code={r.code} />)}>Edit</button>}
                    </td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={10} className="empty">No materials match.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function RmModal({ code }: { code?: string }) {
  const r = code ? rmBy[code] : null;
  const [v, setV] = useState({
    code: r ? r.code : "RM-", name: r?.name || "", cat: String(r ? r.cat : 0), uom: r?.uom || "kg", rate: r ? String(r.rate) : "", reorder: String(r ? r.reorder : 0),
    bin: "", open: "0", alt: r ? (r.alt || []).map((a: any) => `${a.u} = ${a.f}`).join("\n") : "",
  });
  const [wc, setWc] = useState({ shape: "sheet", mat: String(DENS[0][1]), a: "2500", b: "1250", c: "2" });
  const [e, setE] = useState<Record<string, string>>({});
  const set = (k: keyof typeof v) => (x: any) => setV({ ...v, [k]: x.target.value });
  // Metal weight calculator
  const d = parseFloat(wc.mat) * 1000, A = numOf(wc.a) / 1000, B = numOf(wc.b) / 1000, C = numOf(wc.c) / 1000;
  const area = wc.shape === "sheet" ? B * C : wc.shape === "round" ? (Math.PI / 4) * B * B : B * B - Math.max(0, B - 2 * C) ** 2;
  const perM = area * d, piece = perM * A;
  const wName = wc.shape === "sheet" ? `piece ${Math.round(A * 1000)}×${Math.round(B * 1000)}×${Math.round(C * 1000)}` : wc.shape === "round" ? `length ${A} m, Ø${Math.round(B * 1000)}` : `length ${A} m, ${Math.round(B * 1000)}×${Math.round(B * 1000)}×${Math.round(C * 1000)}`;
  const w = { piece: Math.round(piece * 100) / 100, perM: Math.round(perM * 1000) / 1000, name: wName };
  const wcAdd = (kind: "piece" | "m") => {
    const base = v.uom;
    let line = "";
    if (kind === "piece") {
      if (base !== "kg") return toast("Piece weight applies to materials stocked in kg.", true);
      line = `${w.name} = ${w.piece}`;
    } else {
      if (wc.shape === "sheet") return toast("Weight per metre applies to bars and tubes.", true);
      if (base === "kg") line = `m = ${w.perM}`;
      else if (base === "m") line = `kg = ${Math.round((1 / w.perM) * 10000) / 10000}`;
      else return toast("Stock unit must be kg or m.", true);
    }
    setV({ ...v, alt: (v.alt.trim() ? v.alt.trim() + "\n" : "") + line });
    toast(`Added: ${line}`);
  };
  const save = () => {
    if (!allow("materials")) return;
    const c = r ? r.code : v.code.trim().toUpperCase(), name = v.name.trim(), rate = parseFloat(v.rate);
    const errs: Record<string, string> = {};
    if (!r) {
      const ce = !/^RM-[A-Z0-9-]{2,16}$/.test(c) ? "Start with RM- then 2 to 16 capital letters, numbers or hyphens." : rmBy[c] ? "This material code already exists." : "";
      if (ce) errs.code = ce;
    }
    if (!name) errs.name = "Enter a description.";
    if (!(rate >= 0 && v.rate !== "")) errs.rate = "Enter a rate.";
    const cat = +v.cat;
    const pa = parseAlt(v.alt, r ? r.uom : v.uom);
    if (pa.err) errs.alt = pa.err;
    setE(errs);
    if (Object.keys(errs).length) return;
    const data = { name, cat, uom: r ? r.uom : v.uom, rate, reorder: parseFloat(v.reorder) || 0, service: cat === 7, alt: pa.out };
    if (r) { Object.assign(r, data); toast(`${name} saved`); }
    else {
      const n = { code: c, ...data, onHand: 0, bin: v.bin.trim() || "Unassigned", lead: LEAD_BY_CAT[cat], max: Math.ceil((parseFloat(v.reorder) || 0) * 2.5), vendor: VEN_BY_CAT[cat] };
      RM.push(n); rmBy[c] = n;
      const ob = parseFloat(v.open) || 0;
      if (ob) stockMove(c, ob, "Opening stock", "Material master");
      toast(`${name} added to raw materials`);
    }
    closeModal(); bump();
  };
  return (
    <Modal wide title={r ? `Edit material · ${r.name}` : "Add raw material"}
      foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>{r ? "Save material" : "Add material"}</button></>}>
      <div className="form-grid">
        <Field id="rm-code" label="Material code *" err={e.code}><input className={`input mono ${e.code ? "invalid" : ""}`} id="rm-code" value={v.code} onChange={set("code")} disabled={!!r} /></Field>
        <div className="field" style={{ gridColumn: "span 2" }}>
          <label htmlFor="rm-name">Description *</label>
          <input className={`input ${e.name ? "invalid" : ""}`} id="rm-name" value={v.name} onChange={set("name")} placeholder="e.g. SS 304 sheet, 3.0 mm" />
          {e.name && <span className="field-err">{e.name}</span>}
        </div>
        <Field id="rm-cat-m" label="Category">
          <select className="input" id="rm-cat-m" value={v.cat} onChange={set("cat")}>{CATS.map((c: string, i: number) => <option key={i} value={String(i)}>{c}</option>)}</select>
        </Field>
        <Field id="rm-uom" label="Stock (base) unit">
          <select className="input" id="rm-uom" value={v.uom} onChange={set("uom")} disabled={!!r}>{[...new Set([...UOMS, v.uom].filter(Boolean))].map((u: string) => <option key={u}>{u}</option>)}</select>
        </Field>
        <Field id="rm-rate" label="Rate per base unit (₹) *" err={e.rate}><input className={`input num ${e.rate ? "invalid" : ""}`} id="rm-rate" type="number" min={0} step="any" value={v.rate} onChange={set("rate")} /></Field>
        <Field id="rm-reorder" label="Reorder level"><input className="input num" id="rm-reorder" type="number" min={0} step="any" value={v.reorder} onChange={set("reorder")} /></Field>
        {!r && <Field id="rm-bin" label="Bin location"><input className="input" id="rm-bin" value={v.bin} onChange={set("bin")} placeholder="e.g. Rack B-12" /></Field>}
        {!r && <Field id="rm-open" label="Opening stock"><input className="input num" id="rm-open" type="number" min={0} step="any" value={v.open} onChange={set("open")} /></Field>}
        <Field id="rm-alt" label="Alternate units (one per line: unit name = how many base units)" err={e.alt} span>
          <textarea className={`input mono ${e.alt ? "invalid" : ""}`} id="rm-alt" rows={3} value={v.alt} onChange={set("alt")} placeholder={"sheet 1250×2500 = 49.56\nm = 9.56"} />
        </Field>
      </div>
      <div className="approval-box">
        <h3 style={{ fontSize: 14 }}>Metal weight calculator</h3>
        <div className="form-grid">
          <Field id="wc-shape" label="Shape">
            <select className="input" id="wc-shape" value={wc.shape} onChange={(x) => setWc({ ...wc, shape: x.target.value })}>
              <option value="sheet">Sheet / plate / block</option><option value="round">Round bar</option><option value="sqtube">Square tube</option>
            </select>
          </Field>
          <Field id="wc-mat" label="Material">
            <select className="input" id="wc-mat" value={wc.mat} onChange={(x) => setWc({ ...wc, mat: x.target.value })}>
              {DENS.map((dd: any) => <option key={dd[0]} value={String(dd[1])}>{dd[0]} ({dd[1]} g/cm³)</option>)}
            </select>
          </Field>
          <Field id="wc-a" label="Length / L (mm)"><input className="input num" id="wc-a" type="number" value={wc.a} onChange={(x) => setWc({ ...wc, a: x.target.value })} /></Field>
          <Field id="wc-b" label={wc.shape === "sheet" ? "Width (mm)" : wc.shape === "round" ? "Diameter (mm)" : "Outside size (mm)"}>
            <input className="input num" id="wc-b" type="number" value={wc.b} onChange={(x) => setWc({ ...wc, b: x.target.value })} />
          </Field>
          <Field id="wc-c" label={wc.shape === "sheet" ? "Thickness (mm)" : wc.shape === "round" ? "Not used" : "Wall thickness (mm)"}>
            <input className="input num" id="wc-c" type="number" value={wc.c} onChange={(x) => setWc({ ...wc, c: x.target.value })} />
          </Field>
        </div>
        <div className="inv-pay">
          <div><span className="muted small">Weight per piece</span><b>{qfmt(w.piece)} kg</b></div>
          <div><span className="muted small">Weight per metre</span><b>{wc.shape === "sheet" ? "—" : qfmt(w.perM) + " kg/m"}</b></div>
          <div><span className="muted small">Piece name</span><b className="small">{w.name}</b></div>
        </div>
        <div className="actions">
          <button type="button" className="btn sm" onClick={() => wcAdd("piece")}>Add as piece unit</button>
          <button type="button" className="btn sm" onClick={() => wcAdd("m")}>Add weight per metre</button>
        </div>
      </div>
    </Modal>
  );
}
