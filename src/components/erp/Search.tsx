// Smart search: a filter bar under every page title (words, column:value, numbers with > < =, -exclude)
// and "Search everything" across all records the role can see (Ctrl+K).
import { useEffect, useRef, useState } from "react";
import {
  BILLS, CHILD_ITEMS, CONTACTS, CUST, FG, GATES, GRNS, INDENTS, INSTALLED, INVOICES, LEADS, MRS, ORDERS, POS, QUOTES, RM, STAFF, VENDORS, WOS,
  billStatus, custBy, fgBy, invBal, orderStatus, orderValue, quoteValue, rmBy, venBy,
} from "@/erp/engine";
import { ds, inr, qfmt } from "@/erp/format";
import { UI, canSee, setUI } from "@/erp/session";
import { go, routeName } from "@/erp/nav";
import { Modal, closeModal, openModal } from "./ui";
import { Cust360 } from "./pages/Crm";
import { QuoteDetail } from "./pages/Quotes";
import { OrderDetail } from "./pages/Orders";
import { InvoiceModal } from "./pages/Invoices";
import { BillDetail, GateDetail, GrnDetail, IndentDetail, PoDetail } from "./pages/Purchase";
import { MrDetail, StockCard } from "./pages/Stores";

if (!UI.srch) UI.srch = {};

export const SearchIcon = ({ size }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={size ? { width: size, height: size } : undefined}>
    <path d="M10 3a7 7 0 0 1 5.6 11.2l4.6 4.6-1.4 1.4-4.6-4.6A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />
  </svg>
);

// Screen-specific quick filters: [label, query]. Status values on the page are added automatically.
const SRCH_CFG: Record<string, { ex: string; chips: [string, string][] }> = {
  dashboard: { ex: "overdue", chips: [["Overdue", "overdue"], ["Approvals", "approval"], ["Ready to dispatch", '"ready to dispatch"']] },
  leads: { ex: "EB-160 overdue", chips: [["Overdue follow-up", "overdue"], ["Due today", "today"], ["Expo leads", "expo"], ["Website", "website"]] },
  crm: { ex: "customer:kaveri overdue", chips: [["Overdue", "overdue"], ["Today", "today"], ["Collection calls", "collection"], ["Visits", "visit"]] },
  customers: { ex: "receivable>1L", chips: [["Export", "export"], ["Receivable over 1L", "receivable>1L"], ["Has open orders", "open>0"]] },
  quotes: { ex: "discount>5 status:pending", chips: [["Above 5% discount", "discount>5"], ["Over 10 lakh", "net>10L"]] },
  orders: { ex: "status:ready value>10L", chips: [["Late", "late"], ["Advance pending", "advance:pending"], ["Over 10 lakh", "value>10L"]] },
  invoices: { ex: "balance>0 igst", chips: [["Open balance", "balance>0"], ["Export (LUT)", "export"], ["IGST", "igst"], ["Over 5 lakh", "total>5L"]] },
  receivables: { ex: "overdue>30 balance>1L", chips: [["Overdue 30+ days", "overdue>30"], ["Overdue 60+ days", "overdue>60"], ["Broken promise", "broken"], ["Balance over 1L", "balance>1L"]] },
  payables: { ex: "msme overdue", chips: [["MSME", "msme"], ["Overdue", "overdue"], ["Balance over 1L", "balance>1L"]] },
  products: { ex: "change part", chips: [["Machines", "machine"], ["Change parts", '"change part"'], ["No BOM", '"no bom"']] },
  combos: { ex: "included", chips: [["Included", "included"], ["Optional", "optional"], ["Services", "service"]] },
  bom: { ex: "forming", chips: [] },
  materials: { ex: "category:electrical", chips: [["Below reorder", "reorder"], ["Job work", "job"]] },
  forecast: { ex: "change part", chips: [["Machines", "machines"], ["Change parts", '"change parts"'], ["Not yet booked", "booked>0"]] },
  mrp: { ex: "shortage>0", chips: [["Short", "shortage>0"]] },
  workorders: { ex: "EB-160", chips: [] },
  dispatch: { ex: "export", chips: [["Export", "export"]] },
  purchase: { ex: "vendor:balaji", chips: [["Overdue", "overdue"], ["Rejected qty", "rejected>0"]] },
  vendors: { ex: "city:bengaluru", chips: [["Bengaluru", "bengaluru"], ["Job work", "job"]] },
  indent: { ex: "status:pending", chips: [] }, po: { ex: "vendor:balaji", chips: [["Overdue", "late"]] }, gate: { ex: "returnable", chips: [["Returnable", "returnable"]] },
  grn: { ex: "rejected", chips: [["Rejected", "rejected"]] }, bills: { ex: "mismatch", chips: [["On hold", "hold"]] },
  stores: { ex: "MR-", chips: [] }, inventory: { ex: "below reorder", chips: [["Below reorder", "reorder"]] }, planning: { ex: "order", chips: [] }, mr: { ex: "status:approved", chips: [] },
  service: { ex: "amc expired", chips: [["AMC due", "amc"], ["Open tickets", "open"]] },
  staff: { ex: "role:sales", chips: [["Sales", "sales"], ["Inactive", "inactive"]] }, roles: { ex: "approves", chips: [] },
  help: { ex: "GRN", chips: [["BOM", "bom"], ["GRN", "grn"], ["GST invoice", "invoice"], ["Units", "kg"]] },
};

const sNorm = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9.₹%]+/g, "");
const sNorm0 = (s: any) => sNorm(s).replace(/([a-z])0+(\d)/g, "$1$2");
/** "₹ 1,06,200" / "12.1 L" / "3 Cr" / "50k" → number */
function sAmt(t: any) {
  const m = String(t).replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)\s*(cr|crore|l|lakh|lac|k)?\b/i);
  if (!m) return null;
  const u = (m[2] || "").toLowerCase();
  return +m[1] * (u.startsWith("cr") ? 1e7 : u.startsWith("l") ? 1e5 : u === "k" ? 1e3 : 1);
}
type Term = { neg: boolean; field: string | null; op: string | null; val: string };
function sParse(q: string): Term[] {
  const terms: Term[] = [];
  const re = /\s*(-)?(?:([a-z][a-z.]*)\s*(:|>=|<=|>|<|=))?\s*(?:"([^"]+)"|(\S+))/gi;
  let m;
  while ((m = re.exec(q))) {
    const val = m[4] != null ? m[4] : m[5];
    if (val == null || val === "") { if (re.lastIndex === m.index) re.lastIndex++; continue; }
    terms.push({ neg: !!m[1], field: m[2] ? m[2].trim().toLowerCase() : null, op: m[3] || null, val });
  }
  return terms;
}
type Item = { el: HTMLElement; table: HTMLTableElement | null; heads: string[]; cells: string[] };
function sItems(main: HTMLElement): Item[] {
  const out: Item[] = [];
  main.querySelectorAll<HTMLTableElement>("table.data").forEach((t) => {
    if (t.closest(".modal") || t.closest(".srch-skip")) return;
    if (t.querySelector("tbody input:not([type=checkbox]),tbody select,tbody textarea")) return;
    const heads = [...t.querySelectorAll("thead th")].map((h) => (h.textContent || "").trim().toLowerCase());
    t.querySelectorAll<HTMLTableRowElement>(":scope > tbody > tr").forEach((r) => {
      if (r.querySelector("td.empty") || r.classList.contains("srch-none")) return;
      out.push({ el: r, table: t, heads, cells: [...r.children].map((c) => c.textContent || "") });
    });
  });
  main.querySelectorAll<HTMLElement>(".k-card,.fg-card,.help-body > section").forEach((el) => out.push({ el, table: null, heads: [], cells: [el.textContent || ""] }));
  return out;
}
function sMatchTerm(it: Item, tm: Term) {
  const text = it.cells.join(" "), low = text.toLowerCase();
  const f = tm.field, v = tm.val;
  if (f && /^(overdue|late)$/.test(f) && tm.op && tm.op !== ":") {
    // overdue>30 → "(n)d overdue" / "n days late"
    const m = low.match(/(\d+)\s*d(?:ays)?\s*(?:overdue|late)/);
    const n = m ? +m[1] : 0, x = +v;
    return !!(m && (tm.op === ">" ? n > x : tm.op === ">=" ? n >= x : tm.op === "<" ? n < x : tm.op === "<=" ? n <= x : n === x));
  }
  let hay = [text];
  if (f) {
    const idx = it.heads.map((h, i) => [h, i] as [string, number]).filter(([h]) => h && (h.startsWith(f) || h.split(/[\s/·]+/).some((w) => w.startsWith(f)))).map(([, i]) => i);
    if (idx.length) hay = idx.map((i) => it.cells[i] || "");
    else if (it.heads.length) return tm.op === ":" ? low.includes(v.toLowerCase()) : false;
  }
  if (tm.op && tm.op !== ":") {
    const x = sAmt(v);
    if (x == null) return false;
    return hay.some((h) => {
      const n = sAmt(String(h).replace(/[^\d.,\sa-z₹-]/gi, " ").replace(/₹/g, ""));
      if (n == null) return false;
      return tm.op === ">" ? n > x : tm.op === ">=" ? n >= x : tm.op === "<" ? n < x : tm.op === "<=" ? n <= x : Math.abs(n - x) < 0.5;
    });
  }
  const words = v.toLowerCase().split(/\s+/).filter(Boolean);
  return hay.some((h) => {
    const hl = String(h).toLowerCase(), hn = sNorm(h), h0 = sNorm0(h);
    return words.every((w) => hl.includes(w) || (sNorm(w) && (hn.includes(sNorm(w)) || h0.includes(sNorm0(w)))));
  });
}
const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Meta = { total: number; shown: number; heads: string[]; auto: [string, string][] };
/** Filters the rows and cards of #main in place; returns counts plus column heads and status pills for chips. */
function applySearch(main: HTMLElement, q: string): Meta {
  const items = sItems(main);
  const terms = sParse(q.trim());
  let shown = 0;
  main.querySelectorAll(".srch-empty").forEach((x) => x.remove());
  items.forEach((it) => {
    const ok = !terms.length || terms.every((t) => sMatchTerm(it, t) !== t.neg);
    it.el.hidden = !ok;
    if (ok) shown++;
  });
  if (terms.length) {
    const tables = new Set(items.filter((i) => i.table).map((i) => i.table!));
    tables.forEach((t) => {
      const rows = items.filter((i) => i.table === t);
      if (rows.length && rows.every((i) => i.el.hidden)) {
        const cols = Math.max(1, t.querySelectorAll("thead th").length);
        const tr = document.createElement("tr");
        tr.className = "srch-empty srch-none";
        tr.innerHTML = `<td colspan="${cols}" class="empty">No rows match “${escHtml(q.trim())}”.</td>`;
        t.querySelector("tbody")?.appendChild(tr);
      }
    });
  }
  const heads = [...new Set(items.filter((i) => i.table).flatMap((i) => i.heads).filter((h) => h && h.length < 24 && !/^\W*$/.test(h)))].slice(0, 8);
  const pills: Record<string, number> = {};
  items.forEach((it) => it.el.querySelectorAll(".pill").forEach((p) => { const t = (p.textContent || "").trim(); if (t && !/\d/.test(t) && t.length < 28) pills[t] = (pills[t] || 0) + 1; }));
  const auto = Object.entries(pills).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => [t, `"${t.toLowerCase()}"`] as [string, string]);
  return { total: items.length, shown, heads, auto };
}

/** The search bar under every page title. */
export function ScreenSearch({ route }: { route: string }) {
  const bar = useRef<HTMLDivElement>(null);
  const q = UI.srch[route] || "";
  const qRef = useRef(q);
  qRef.current = q;
  const [meta, setMeta] = useState<Meta | null>(null);
  const run = () => {
    const main = document.getElementById("main");
    if (!main) return;
    const m = applySearch(main, qRef.current);
    setMeta((old) => (old && JSON.stringify(old) === JSON.stringify(m) ? old : m));
  };
  // Re-apply after every change to the page (React re-renders rows, tabs switch, data changes).
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;
    let raf = 0;
    const obs = new MutationObserver((recs) => {
      if (recs.every((r) => (r.target as Element).closest?.(".srch-bar") || [...r.addedNodes, ...r.removedNodes].every((n) => (n as Element).classList?.contains("srch-empty")))) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { obs.disconnect(); run(); obs.takeRecords(); obs.observe(main, { childList: true, subtree: true, characterData: true }); });
    });
    run();
    obs.observe(main, { childList: true, subtree: true, characterData: true });
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [route]);
  useEffect(() => { run(); }, [q]);

  if (meta && !meta.total) return null;
  const cfg = SRCH_CFG[route] || { ex: "", chips: [] };
  const heads = meta?.heads || [];
  const chips = [...cfg.chips, ...(meta?.auto || []).filter(([t]) => !cfg.chips.some(([l]) => l.toLowerCase() === t.toLowerCase()))].slice(0, 9);
  const setQ = (v: string) => setUI({ srch: { ...UI.srch, [route]: v } });
  const chip = (qq: string) => {
    let cur = q;
    if (cur.toLowerCase().includes(qq.toLowerCase())) cur = cur.replace(new RegExp(qq.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").replace(/\s+/g, " ").trim();
    else cur = (cur + " " + qq).trim();
    setQ(cur);
  };
  const fieldWord = (h: string) => h.split(/[\s/·]+/)[0].replace(/[^a-z0-9]/g, "");
  const terms = sParse(q.trim());
  return (
    <div className="srch-bar" id="srch-bar" role="search" ref={bar}>
      <div className="srch-row">
        <div className="srch-box">
          <SearchIcon />
          <label htmlFor="srch-q" style={{ position: "absolute", left: -9999 }}>Search this screen</label>
          <input id="srch-q" className="srch-input" type="search" autoComplete="off" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQ(""); }}
            placeholder={`Search this screen${heads.length ? " by " + heads.slice(0, 4).join(", ") : ""}…  e.g. ${cfg.ex || ""}`} />
          <span className="srch-count small muted" id="srch-count">{meta ? (terms.length ? `${meta.shown} of ${meta.total} shown` : `${meta.total} records`) : ""}</span>
        </div>
        <button className="btn" onClick={() => openGlobalSearch()} title="Search every record (Ctrl+K)"><SearchIcon size={16} /> Search everything</button>
        <button className="btn ghost sm" onClick={() => { setUI({ srchHelp: !UI.srchHelp }); document.getElementById("srch-q")?.focus(); }} aria-expanded={!!UI.srchHelp}>Tips</button>
      </div>
      {chips.length > 0 && (
        <div className="srch-chips" role="group" aria-label="Quick filters">
          {chips.map(([l, qq]) => <button key={l} className="chip" onClick={() => chip(qq)} aria-pressed={q.toLowerCase().includes(qq.toLowerCase())}>{l}</button>)}
          {q && <button className="chip ghost" onClick={() => setQ("")}>Clear</button>}
        </div>
      )}
      {UI.srchHelp && (
        <div className="srch-tips small">
          <div><b>Words</b> match anywhere in a row, in any order: <code>kaveri alu</code>. IDs work without dashes or zeros: <code>q142</code> finds Q-0142.</div>
          <div>
            <b>Column search</b> with <code>column:value</code>
            {heads.length > 0 && <>, for example {heads.slice(0, 4).map((h) => <button key={h} className="linkish" onClick={() => { setQ((q.trim() + " " + fieldWord(h) + ":").trim()); document.getElementById("srch-q")?.focus(); }}>{fieldWord(h)}:</button>).reduce((a: any[], b, i) => (i ? [...a, " ", b] : [b]), [])}</>}
            . Use quotes for phrases: <code>status:"pending approval"</code>.
          </div>
          <div><b>Numbers</b> with &gt; &lt; = and L, Cr or k: <code>balance&gt;1L</code>, <code>discount&gt;5</code>, <code>overdue&gt;30</code> (days).</div>
          <div><b>Exclude</b> with a minus: <code>-paid</code>. Press <kbd>/</kbd> to search this screen, <kbd>Ctrl</kbd>+<kbd>K</kbd> to search everything.</div>
        </div>
      )}
    </div>
  );
}

/* ================= Search everything ================= */
type Hit = { route: string; type: string; id: string; title: string; sub: string; open: string | null; sv?: string; key: string };
function gsIndex(): Hit[] {
  const I: Hit[] = [];
  const add = (route: string, type: string, id: string, title: string, sub: string, open: string | null, sv?: string) => {
    if (canSee(route)) I.push({ route, type, id, title, sub, open, sv, key: `${id} ${title} ${sub} ${type}` });
  };
  CUST.forEach((c: any) => add(canSee("customers") ? "customers" : "crm", "Customer", c.id, c.name, `${c.city}, ${c.country}${c.gstin ? " · " + c.gstin : ""}`, "cust", c.name));
  CONTACTS.forEach((p: any) => add("crm", "Contact", p.id, p.name, `${p.desig} · ${custBy(p.cust).name} · ${p.mobile}`, "contact", p.name));
  LEADS.forEach((l: any) => add("leads", "Lead", l.id, `${custBy(l.cust).name}: ${fgBy[l.item] ? fgBy[l.item].name : ""}`, `${l.stage} · ${l.source}`, null, custBy(l.cust).name));
  QUOTES.forEach((q: any) => add("quotes", "Quotation", q.id, custBy(q.cust).name, `${q.status} · ${inr(quoteValue(q))}`, "quote"));
  ORDERS.forEach((o: any) => add("orders", "Sales order", o.id, custBy(o.cust).name, `${orderStatus(o).t} · PO ${o.custPO || "—"} · ${inr(orderValue(o))}`, "order"));
  INVOICES.forEach((v: any) => add(canSee("receivables") ? "receivables" : "invoices", "Invoice", v.id, custBy(v.cust).name, `${ds(v.date)} · ${inr(v.total)} · balance ${inr(invBal(v))}`, "inv"));
  WOS.forEach((w: any) => add("workorders", "Work order", w.id, fgBy[w.item] ? fgBy[w.item].name : w.item, `${w.so} · qty ${w.qty}`, null));
  FG.forEach((f: any) => add("products", "Product", f.code, f.name, `${f.family} · ${inr(f.price)}`, null));
  CHILD_ITEMS.forEach((c: any) => add("combos", "Child item", c.code, c.name, `${c.family} · ${inr(c.price)}`, null));
  RM.forEach((r: any) => add("materials", "Raw material", r.code, r.name, `${qfmt(r.onHand)} ${r.uom} on hand`, "rm"));
  VENDORS.forEach((v: any) => add("vendors", "Vendor", v.id, v.name, `${v.city} · ${v.supplies}`, null, v.name));
  INDENTS.forEach((d: any) => add("indent", "Indent", d.id, d.lines.map((l: any) => (rmBy[l.rm] ? rmBy[l.rm].name : l.rm)).slice(0, 2).join(", "), d.status, "indent"));
  POS.forEach((p: any) => add("po", "Purchase order", p.id, venBy(p.vendor).name, p.status, "po"));
  GATES.forEach((g: any) => add("gate", "Gate pass", g.id, venBy(g.party) ? venBy(g.party).name : "", `${g.dir === "in" ? "Inward" : "Outward"} · ${g.status}`, "gate"));
  GRNS.forEach((g: any) => add("grn", "GRN", g.id, venBy(g.party) ? venBy(g.party).name : "", g.status, "grn"));
  MRS.forEach((m: any) => add("mr", "Material requisition", m.id, m.wo || "", m.status, "mr"));
  BILLS.forEach((b: any) => add(canSee("bills") ? "bills" : "payables", "Vendor bill", b.id, venBy(b.vendor).name, `${b.vinv} · ${billStatus(b).t}`, "bill"));
  INSTALLED.forEach((i: any) => add("service", "Machine", i.serial, fgBy[i.item].name, custBy(i.cust).name, null));
  STAFF.forEach((x: any) => add("staff", "Staff", x.code, x.name, `${x.designation} · ${x.username}`, null));
  return I;
}

export function openGlobalSearch() {
  openModal(<GlobalSearch />);
}

function gsPick(x: Hit) {
  closeModal();
  const srch = { ...UI.srch, [x.route]: x.sv || x.id };
  const patch: Record<string, any> = {};
  if (x.route === "combos") patch.cbTab = "items";
  if (x.route === "receivables") patch.arTab = "open";
  if (x.route === "payables") { patch.apTab = "ledger"; patch.apVen = BILLS.find((b: any) => b.id === x.id).vendor; srch.payables = ""; }
  if (x.route === "crm") patch.crmTab = x.type === "Contact" ? "contacts" : "pipe";
  setUI({ ...patch, srch });
  go(x.route);
  const opens: Record<string, () => void> = {
    cust: () => openModal(<Cust360 cid={x.id} />),
    contact: () => openModal(<Cust360 cid={CONTACTS.find((p: any) => p.id === x.id).cust} />),
    quote: () => openModal(<QuoteDetail id={x.id} />),
    order: () => openModal(<OrderDetail id={x.id} />),
    inv: () => openModal(<InvoiceModal id={x.id} />),
    po: () => openModal(<PoDetail id={x.id} />),
    bill: () => openModal(<BillDetail id={x.id} />),
    indent: () => openModal(<IndentDetail id={x.id} />),
    mr: () => openModal(<MrDetail id={x.id} />),
    grn: () => openModal(<GrnDetail id={x.id} />),
    gate: () => openModal(<GateDetail id={x.id} />),
    rm: () => openModal(<StockCard code={x.id} />),
  };
  const o = x.open ? opens[x.open] : null;
  if (o) setTimeout(o, 0);
}

function GlobalSearch() {
  const [idx] = useState(gsIndex);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const res = idx
    .map((x) => {
      const k = x.key.toLowerCase(), kn = sNorm0(x.key);
      let sc = 0;
      for (const w of words) {
        const wn = sNorm0(w);
        if (k.includes(w)) sc += x.id.toLowerCase() === w ? 50 : sNorm0(x.id) === wn ? 40 : x.title.toLowerCase().startsWith(w) ? 12 : 5;
        else if (wn && kn.includes(wn)) sc += 4;
        else return null;
      }
      return { x, sc };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.sc - a.sc)
    .slice(0, words.length ? 30 : 12)
    .map((r: any) => r.x as Hit);
  const cur = Math.min(sel, Math.max(0, res.length - 1));
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${cur}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cur]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setSel(Math.max(0, Math.min(res.length - 1, cur + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (res[cur]) gsPick(res[cur]);
    }
  };
  return (
    <Modal title="Search everything">
      <div className="srch-box" style={{ marginBottom: 10 }}>
        <SearchIcon />
        <label htmlFor="gs-q" style={{ position: "absolute", left: -9999 }}>Search every record</label>
        <input id="gs-q" className="srch-input" type="search" autoComplete="off" value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey}
          placeholder="Customer, quote, order, invoice, PO, bill, item, staff…" />
      </div>
      <div className="gs-res" role="listbox" aria-label="Results" ref={list}>
        {res.map((x, i) => (
          <button key={x.type + x.id} data-i={i} className="gs-item" role="option" aria-selected={i === cur} onClick={() => gsPick(x)}>
            <span className="gs-type">{x.type}</span>
            <span className="gs-main"><b className="mono">{x.id}</b> {x.title}<span className="cell-sub">{x.sub}</span></span>
            <span className="small muted">{routeName(x.route)[1]}</span>
          </button>
        ))}
        {!res.length && <div className="empty">Nothing matches “{q}”.</div>}
      </div>
      <p className="small muted" style={{ margin: "8px 0 0" }}>Up and down arrows to move, Enter to open. Results respect your role's access.</p>
    </Modal>
  );
}
