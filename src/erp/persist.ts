// Phase 2: keeps the in-memory ERP engine in sync with Lovable Cloud (Supabase).
//
// Every record of every engine collection is one row of public.erp_records
// (collection, id, data). At start-up all rows are loaded into the engine; after each change
// (bump()) the records that differ from what was last saved are upserted or deleted; and changes
// made by other users arrive through Supabase Realtime and are applied in place.
// If the table is empty, the built-in sample data is uploaded as the starting point.
import { supabase } from "@/integrations/supabase/client";
import {
  ACTS, ADJS, BILLS, BOM, BOMREV, CHILD_ITEMS, COMBOS, CONTACTS, CUST, DCS, DEBITS, FG, GATES, GRNS, INDENTS, INSTALLED, INVOICES,
  LEADS, LEDGER, MRS, ORDERS, POS, PRS, QUOTES, RM, ROLES, SEQ, SESSION, STAFF, TICKETS, VENDORS, WOS, fgBy, rmBy, seq,
} from "./engine";
import { bump, onChange } from "./store";

const TABLE = "erp_records";
type Row = { collection: string; id: string; data: any };

type ArrColl = { name: string; kind: "array"; arr: any[]; key?: (x: any) => string };
type MapColl = { name: string; kind: "map"; obj: Record<string, any> };
type Coll = ArrColl | MapColl;

const byId = (x: any) => x.id;
const COLLS: Coll[] = [
  { name: "roles", kind: "array", arr: ROLES, key: byId },
  { name: "staff", kind: "array", arr: STAFF, key: byId },
  { name: "customers", kind: "array", arr: CUST, key: byId },
  { name: "contacts", kind: "array", arr: CONTACTS, key: byId },
  { name: "vendors", kind: "array", arr: VENDORS, key: byId },
  { name: "products", kind: "array", arr: FG, key: (x) => x.code },
  { name: "child_items", kind: "array", arr: CHILD_ITEMS, key: (x) => x.code },
  { name: "materials", kind: "array", arr: RM, key: (x) => x.code },
  { name: "bom", kind: "map", obj: BOM },
  { name: "bom_versions", kind: "map", obj: BOMREV },
  { name: "combos", kind: "map", obj: COMBOS },
  { name: "leads", kind: "array", arr: LEADS, key: byId },
  { name: "activities", kind: "array", arr: ACTS, key: byId },
  { name: "quotations", kind: "array", arr: QUOTES, key: byId },
  { name: "sales_orders", kind: "array", arr: ORDERS, key: byId },
  { name: "work_orders", kind: "array", arr: WOS, key: byId },
  { name: "purchase_requests", kind: "array", arr: PRS },
  { name: "delivery_challans", kind: "array", arr: DCS, key: byId },
  { name: "invoices", kind: "array", arr: INVOICES, key: byId },
  { name: "installed_base", kind: "array", arr: INSTALLED, key: (x) => x.serial },
  { name: "service_tickets", kind: "array", arr: TICKETS, key: byId },
  { name: "indents", kind: "array", arr: INDENTS, key: byId },
  { name: "purchase_orders", kind: "array", arr: POS, key: byId },
  { name: "gate_passes", kind: "array", arr: GATES, key: byId },
  { name: "grns", kind: "array", arr: GRNS, key: byId },
  { name: "requisitions", kind: "array", arr: MRS, key: byId },
  { name: "vendor_bills", kind: "array", arr: BILLS, key: byId },
  { name: "debit_notes", kind: "array", arr: DEBITS, key: byId },
  { name: "stock_ledger", kind: "array", arr: LEDGER },
  { name: "stock_adjustments", kind: "array", arr: ADJS, key: byId },
  { name: "meta", kind: "map", obj: { SEQ, seq } },
];
const collBy = Object.fromEntries(COLLS.map((c) => [c.name, c]));

/* ---------------- Keys and order for array records ---------------- */
// Records without a natural id (stock ledger lines) get a generated key; every array record keeps
// its position so lists come back in the same order. Both live beside the record, not inside it.
const meta = new WeakMap<object, { k: string; o: number }>();
const nextOrder: Record<string, number> = {};
const newKey = () => (typeof globalThis.crypto?.randomUUID === "function" ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
function recMeta(c: ArrColl, x: any, idx: number) {
  let m = meta.get(x);
  if (!m) {
    const o = Math.max(nextOrder[c.name] ?? 0, idx);
    nextOrder[c.name] = o + 1;
    m = { k: c.key ? String(c.key(x)) : newKey(), o };
    meta.set(x, m);
  } else if (c.key) m.k = String(c.key(x));
  return m;
}

/* ---------------- JSON with dates ---------------- */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
function revive(v: any): any {
  if (typeof v === "string") return ISO.test(v) ? new Date(v) : v;
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === "object") {
    const o: any = {};
    for (const k of Object.keys(v)) o[k] = revive(v[k]);
    return o;
  }
  return v;
}
/** Key-order independent JSON (jsonb reorders keys), with dates as ISO strings. */
function stable(v: any): string {
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
  return v === undefined ? "null" : JSON.stringify(v);
}
const toJson = (v: any) => JSON.parse(stable(v));

/* ---------------- Snapshot of the engine as rows ---------------- */
// Passwords live in Supabase Auth, never in the record store.
const noPassword = (x: any) => ({ ...x, password: undefined });
function currentRows(): Map<string, Row> {
  const out = new Map<string, Row>();
  for (const c of COLLS) {
    if (c.kind === "array") c.arr.forEach((x, i) => { const m = recMeta(c, x, i); out.set(c.name + "\u0000" + m.k, { collection: c.name, id: m.k, data: { o: m.o, r: c.name === "staff" ? noPassword(x) : x } }); });
    else for (const k of Object.keys(c.obj)) out.set(c.name + "\u0000" + k, { collection: c.name, id: k, data: { r: c.obj[k] } });
  }
  return out;
}

/* ---------------- Applying rows to the engine ---------------- */
function replaceInPlace(target: any, src: any) {
  if (Array.isArray(target) && Array.isArray(src)) { target.length = 0; target.push(...src); return; }
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, src);
}
function rebuildLookups() {
  for (const k of Object.keys(rmBy)) delete rmBy[k];
  RM.forEach((r: any) => (rmBy[r.code] = r));
  for (const k of Object.keys(fgBy)) delete fgBy[k];
  FG.forEach((f: any) => (fgBy[f.code] = f));
  CHILD_ITEMS.forEach((c: any) => (fgBy[c.code] = c));
}
function applyRow(row: Row) {
  const c = collBy[row.collection];
  if (!c) return;
  const rec = revive(row.data?.r);
  if (c.kind === "map") {
    if (c.name === "meta") {
      // Counters only move forward, so two people never get the same new document number.
      const tgt = row.id === "SEQ" ? SEQ : row.id === "seq" ? seq : null;
      if (tgt && rec) for (const k of Object.keys(rec)) (tgt as any)[k] = Math.max((tgt as any)[k] ?? 0, rec[k]);
      return;
    }
    if (c.obj[row.id] && typeof c.obj[row.id] === "object") replaceInPlace(c.obj[row.id], rec);
    else c.obj[row.id] = rec;
    return;
  }
  const o = row.data?.o ?? 0;
  const i = c.arr.findIndex((x, j) => recMeta(c, x, j).k === row.id);
  if (i >= 0) { replaceInPlace(c.arr[i], rec); meta.set(c.arr[i], { k: row.id, o }); return; }
  meta.set(rec, { k: row.id, o });
  nextOrder[c.name] = Math.max(nextOrder[c.name] ?? 0, o + 1);
  let at = c.arr.findIndex((x) => (meta.get(x)?.o ?? 0) > o);
  if (at < 0) at = c.arr.length;
  c.arr.splice(at, 0, rec);
}
function removeRow(collection: string, id: string) {
  const c = collBy[collection];
  if (!c) return;
  if (c.kind === "map") { if (c.name !== "meta") delete c.obj[id]; return; }
  const i = c.arr.findIndex((x, j) => recMeta(c, x, j).k === id);
  if (i >= 0) c.arr.splice(i, 1);
}
function loadAll(rows: Row[]) {
  for (const c of COLLS) {
    if (c.kind === "array") { c.arr.length = 0; nextOrder[c.name] = 0; }
    else if (c.name !== "meta") for (const k of Object.keys(c.obj)) delete c.obj[k];
  }
  rows.slice().sort((a, b) => (a.data?.o ?? 0) - (b.data?.o ?? 0)).forEach(applyRow);
  rebuildLookups();
}

/* ---------------- Document numbers ---------------- */
// Numbers come from counters in each browser, so two people can create the same number at the same
// moment. A new numbered record is therefore inserted, never upserted: if its number is taken, the local
// record gets the next free number (references to it in unsaved records are updated) instead of
// overwriting the other person's document.
type Counter = [Record<string, number>, string];
const NUMBERED: Record<string, { field: string; counter?: (id: string) => Counter }> = {
  customers: { field: "id" },
  contacts: { field: "id", counter: () => [SEQ, "ct"] },
  vendors: { field: "id", counter: () => [SEQ, "ven"] },
  roles: { field: "id", counter: () => [SEQ, "role"] },
  leads: { field: "id", counter: () => [SEQ, "lead"] },
  activities: { field: "id", counter: () => [SEQ, "act"] },
  quotations: { field: "id", counter: () => [SEQ, "q"] },
  sales_orders: { field: "id", counter: () => [SEQ, "so"] },
  work_orders: { field: "id", counter: () => [SEQ, "wo"] },
  delivery_challans: { field: "id", counter: () => [SEQ, "dc"] },
  invoices: { field: "id", counter: () => [SEQ, "inv"] },
  installed_base: { field: "serial", counter: () => [SEQ, "serial"] },
  service_tickets: { field: "id", counter: () => [SEQ, "tk"] },
  indents: { field: "id", counter: () => [seq, "IND"] },
  purchase_orders: { field: "id", counter: () => [seq, "PO"] },
  gate_passes: { field: "id", counter: (id) => [seq, id.startsWith("GP") ? "GP" : "GE"] },
  grns: { field: "id", counter: () => [seq, "GRN"] },
  requisitions: { field: "id", counter: () => [seq, "MR"] },
  vendor_bills: { field: "id", counter: () => [SEQ, "bill"] },
  debit_notes: { field: "id", counter: () => [SEQ, "dn"] },
  stock_adjustments: { field: "id", counter: () => [SEQ, "adj"] },
};
const TAIL = /(\d+)(?!.*\d)/;
/** The same id with its number (the last run of digits, padding kept) replaced. */
const withNumber = (id: string, n: number) => id.replace(TAIL, (d) => String(n).padStart(d.length, "0"));
const numberOf = (id: string) => +(TAIL.exec(id)?.[1] ?? NaN);
const prefixOf = (id: string) => id.replace(TAIL, "#");

/** Replace `from` with `to` in string values (whole id or as a word inside text). */
function rewrite(v: any, from: string, to: string): any {
  if (typeof v === "string") {
    if (v === from) return to;
    return v.includes(from) ? v.replace(new RegExp("(^|[^\\w/-])" + from.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "(?![\\w/-])", "g"), "$1" + to) : v;
  }
  if (Array.isArray(v)) { v.forEach((x, i) => (v[i] = rewrite(x, from, to))); return v; }
  if (v && typeof v === "object" && !(v instanceof Date)) { for (const k of Object.keys(v)) v[k] = rewrite(v[k], from, to); return v; }
  return v;
}

/**
 * Give a local record whose number someone else already used the next free number, and update the
 * references to it in records not yet saved. `taken` lists numbers known to be in use elsewhere.
 */
function renumber(coll: string, rec: any, taken: Set<string> = new Set()) {
  const spec = NUMBERED[coll];
  const c = collBy[coll] as ArrColl;
  const old = String(rec[spec.field]);
  const pre = prefixOf(old);
  const local = new Set(c.arr.filter((x) => x !== rec).map((x) => String(x[spec.field])));
  let n = Math.max(numberOf(old) + 1, ...c.arr.map((x) => String(x[spec.field])).filter((id) => prefixOf(id) === pre).map((id) => numberOf(id) + 1));
  const ctr = spec.counter?.(old);
  if (ctr) n = Math.max(n, ctr[0][ctr[1]] ?? 0);
  while (local.has(withNumber(old, n)) || taken.has(withNumber(old, n))) n++;
  const id = withNumber(old, n);
  if (ctr) ctr[0][ctr[1]] = Math.max(ctr[0][ctr[1]] ?? 0, n + 1);
  // References can only be in records changed here since the last save.
  const cur = currentRows();
  for (const [k, r] of cur) if (saved.get(k) !== stable(r.data)) rewrite(r.data.r, old, id);
  rec[spec.field] = id;
  const m = meta.get(rec);
  if (m) m.k = id;
  rebuildLookups();
  notify(`${old} was also created by someone else at the same moment, so yours is now ${id}.`);
  return id;
}
const isUniqueViolation = (e: any) => e?.code === "23505" || /duplicate key/i.test(e?.message || "");

/** Insert records that are new here; renumber any whose number is already in the database. */
async function insertNew(cur: Map<string, Row>) {
  const fresh = [...cur].filter(([k, r]) => NUMBERED[r.collection] && !saved.has(k));
  for (const [k0, r0] of fresh) {
    let k = k0, r = r0;
    const c = collBy[r.collection] as ArrColl;
    const rec = r.data.r;
    const taken = new Set<string>();
    for (let tries = 0; ; tries++) {
      const s = stable(r.data);
      const { error } = await db().insert({ ...r, data: JSON.parse(s), updated_by: writer() });
      if (!error) { saved.set(k, s); break; }
      if (!isUniqueViolation(error) || tries >= 20) throw error;
      taken.add(r.id);
      const id = renumber(r.collection, rec, taken);
      r = { collection: r.collection, id, data: { o: recMeta(c, rec, 0).o, r: rec } };
      k = keyOf(r);
    }
  }
  return fresh.length > 0;
}

/* ---------------- Sync state ---------------- */
export type SyncStatus = "loading" | "online" | "offline";
export const SYNC: { status: SyncStatus; error: string; lastSaved: Date | null } = { status: "loading", error: "", lastSaved: null };
const saved = new Map<string, string>(); // key → stable JSON of the row data last written or received
const keyOf = (r: { collection: string; id: string }) => r.collection + "\u0000" + r.id;
const SEED: Row[] = [...currentRows().values()].map((r) => ({ ...r, data: toJson(r.data) }));
const db = () => (supabase as any).from(TABLE);
/** Identifies this browser tab, so its own writes echoed back by Realtime are ignored. */
const TAB = newKey();
const writer = () => `${SESSION.user || "-"}|${TAB}`;

async function fetchAll(): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().select("collection,id,data").order("collection").order("id").range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}
async function upsertRows(rows: Row[]) {
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await db().upsert(rows.slice(i, i + 400).map((r) => ({ ...r, updated_by: writer() })), { onConflict: "collection,id" });
    if (error) throw error;
  }
}

let flushing = false, again = false, timer: any = null;
async function flush() {
  if (SYNC.status !== "online") return;
  if (flushing) { again = true; return; }
  flushing = true;
  try {
    if (await insertNew(currentRows())) bump();
    const cur = currentRows();
    const up: Row[] = [];
    const del: Row[] = [];
    cur.forEach((r, k) => { const s = stable(r.data); if (saved.get(k) !== s) { up.push({ ...r, data: JSON.parse(s) }); saved.set(k, s); } });
    [...saved.keys()].forEach((k) => { if (!cur.has(k)) { const [collection, id] = k.split("\u0000"); del.push({ collection, id, data: null }); saved.delete(k); } });
    if (up.length) await upsertRows(up);
    for (const d of del) {
      const { error } = await db().delete().eq("collection", d.collection).eq("id", d.id);
      if (error) throw error;
    }
    if (up.length || del.length) SYNC.lastSaved = new Date();
    SYNC.error = "";
  } catch (e: any) {
    SYNC.error = e?.message || String(e);
    console.error("[MEK-SEL] could not save to the database:", e);
    // Forget what failed so the next change retries it.
    saved.clear();
    (await fetchAll().catch(() => [])).filter((r) => collBy[r.collection]).forEach((r) => saved.set(keyOf(r), stable(r.data)));
    notify("Could not save the last change to the database. It will be retried with your next change.");
  } finally {
    flushing = false;
    if (again) { again = false; schedule(); }
  }
}
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(flush, 250);
}

let notifier: (msg: string) => void = (m) => console.warn(m);
export const setSyncNotifier = (fn: (msg: string) => void) => { notifier = fn; };
const notify = (m: string) => notifier(m);

function subscribeRemote() {
  (supabase as any)
    .channel("erp-records")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, (p: any) => {
      if (p.eventType === "DELETE") {
        const o = p.old || {};
        if (!o.collection || !collBy[o.collection]) return;
        if (!saved.has(keyOf(o))) return;
        saved.delete(keyOf(o));
        removeRow(o.collection, o.id);
      } else {
        const n = p.new as Row & { updated_by?: string };
        if (!collBy[n.collection]) return;
        if (NUMBERED[n.collection] && !saved.has(keyOf(n))) {
          // Someone else saved this number while ours (same number) is still waiting to be saved.
          const c = collBy[n.collection] as ArrColl;
          const mine = c.arr.find((x, j) => recMeta(c, x, j).k === n.id);
          if (mine) renumber(n.collection, mine, new Set([n.id]));
        }
        if (typeof n.updated_by === "string" && n.updated_by.endsWith("|" + TAB)) return; // our own write
        const s = stable(n.data);
        if (saved.get(keyOf(n)) === s) return; // our own write coming back
        saved.set(keyOf(n), s);
        applyRow(n);
      }
      rebuildLookups();
      bump();
    })
    .subscribe();
}

let readyP: Promise<void> | null = null;
/** Load the ERP data from the database once per page load; falls back to sample data offline. */
export function ready(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!readyP) readyP = start();
  return readyP;
}
async function start() {
  try {
    // The records are only readable once signed in to Lovable Cloud.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      // Not signed in yet: work from the sample data, and load the database after sign-in.
      SYNC.status = "offline";
      SYNC.error = "Not signed in to Lovable Cloud";
      readyP = null;
      return;
    }
    let rows = (await fetchAll()).filter((r) => collBy[r.collection]);
    if (!rows.length) {
      await upsertRows(SEED); // first run: the sample data becomes the starting point
      rows = SEED;
    }
    loadAll(rows);
    rows.forEach((r) => saved.set(keyOf(r), stable(r.data)));
    SYNC.status = "online";
    onChange(schedule);
    subscribeRemote();
    schedule(); // push anything the stored data was missing (e.g. new sample collections)
  } catch (e: any) {
    SYNC.status = "offline";
    SYNC.error = e?.message || String(e);
    console.warn("[MEK-SEL] database not available, using sample data in this browser only:", e);
  }
  bump();
}

/** Administrator: wipe the database and start again from the sample data. */
export async function resetToSample() {
  const { error } = await db().delete().neq("collection", "");
  if (error) throw error;
  await upsertRows(SEED);
}
