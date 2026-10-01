// Keeps the in-memory ERP engine in sync with the Lovable Cloud (Supabase) tables.
//
// Every record of every engine collection is stored as table rows (see schema.ts): a header row
// with real columns plus line rows for the lists inside it. At start-up all rows are loaded into the
// engine; after each change (bump()) the rows that differ from what was last saved are upserted or
// deleted; and changes made by other users arrive through Supabase Realtime and are applied in place.
// If the database is empty, the built-in sample data is loaded into it first.
import { supabase } from "@/integrations/supabase/client";
import {
  CHILD_ITEMS,
  FG,
  LIST_DATA,
  RM,
  SEQ,
  SESSION,
  fgBy,
  rebuildLists,
  rmBy,
  seq,
} from "./engine";
import { bump, onChange } from "./store";
import { COLLS, collBy, sampleRows, type ArrColl, type Coll } from "./collections";
import {
  COUNTERS_TABLE,
  fromPhys,
  listToRow,
  parentKey,
  rowToList,
  toPhys,
  type ListSpec,
  type Row,
  type TableSpec,
} from "./schema";

/* ---------------- Keys and order of records ---------------- */
// Records without a natural id (stock ledger lines) get a generated key; every array record keeps
// its position so lists come back in the same order. Both live beside the record, not inside it.
const meta = new WeakMap<object, { k: string; o: number }>();
const nextOrder: Record<string, number> = {};
let keySeq = 0;
const fallbackKey = () =>
  Date.now().toString(36) + (keySeq++).toString(36) + Math.random().toString(36).slice(2);
// Cloudflare Workers refuse crypto random values while a module loads (the server render imports
// this file), so fall back there; server-made keys are never saved.
const newKey = () => {
  try {
    return typeof globalThis.crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : fallbackKey();
  } catch {
    return fallbackKey();
  }
};
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

/** Key-order independent JSON; null and undefined fields are the same (the database stores both as NULL). */
function stable(v: any): string {
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  if (v && typeof v === "object")
    return (
      "{" +
      Object.keys(v)
        .filter((k) => v[k] != null)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stable(v[k]))
        .join(",") +
      "}"
    );
  return v === undefined ? "null" : JSON.stringify(v);
}

/* ---------------- Records as rows ---------------- */
type PRow = {
  table: string;
  coll: string;
  rec: string;
  pk: Record<string, any>;
  row: Row;
  header: boolean;
};
const isList = (c: Coll): c is ArrColl => c.kind === "array" && !!c.list;
const tspec = (c: Coll) => c.spec as TableSpec;
const recKey = (coll: string, key: string) => coll + "\u0000" + key;
const rowKey = (table: string, pk: Record<string, any>) =>
  table + "\u0000" + Object.values(pk).join("\u0000");

/** Every record of the engine, with its key and position. */
function* records(c: Coll): Generator<[string, any, number]> {
  if (c.kind === "array") {
    for (let i = 0; i < c.arr.length; i++) {
      const m = recMeta(c, c.arr[i], i);
      yield [m.k, c.arr[i], m.o];
    }
  } else for (const [i, k] of Object.keys(c.obj).entries()) yield [k, c.obj[k], i];
}
/** The table rows of one record. */
function rowsOf(c: Coll, key: string, rec: any, order: number): PRow[] {
  const rk = recKey(c.name, key);
  if (isList(c))
    return [
      {
        table: c.spec.table,
        coll: c.name,
        rec: rk,
        pk: { code: key },
        row: listToRow(c.spec as ListSpec, rec, order),
        header: true,
      },
    ];
  const t = tspec(c);
  const p = toPhys(t, key, rec, order);
  const out: PRow[] = [];
  if (p.header)
    out.push({
      table: t.table,
      coll: c.name,
      rec: rk,
      pk: { [t.pk.column]: key },
      row: p.header,
      header: true,
    });
  for (const ch of t.children)
    for (const r of p.kids[ch.table] || [])
      out.push({
        table: ch.table,
        coll: c.name,
        rec: rk,
        pk:
          ch.kind === "map"
            ? { [parentKey(t)]: key, [ch.keyCol!.column]: r[ch.keyCol!.column] }
            : { [parentKey(t)]: key, line_no: r.line_no },
        row: r,
        header: false,
      });
  return out;
}
function currentRows(only?: Set<string>): Map<string, PRow> {
  const out = new Map<string, PRow>();
  for (const c of COLLS) {
    if (only && !only.has(c.name)) continue;
    for (const [k, rec, o] of records(c))
      for (const r of rowsOf(c, k, rec, o)) out.set(rowKey(r.table, r.pk), r);
  }
  return out;
}

/** Tables of a collection: [header or list table, ...line tables]. */
function tablesOf(c: Coll): { table: string; header: boolean }[] {
  if (isList(c)) return [{ table: c.spec.table, header: true }];
  const t = tspec(c);
  return [
    ...(t.headerless ? [] : [{ table: t.table, header: true }]),
    ...t.children.map((ch) => ({ table: ch.table, header: false })),
  ];
}
const TABLE_INFO: Record<string, { coll: string; header: boolean }> = {};
COLLS.forEach((c) =>
  tablesOf(c).forEach((x) => (TABLE_INFO[x.table] = { coll: c.name, header: x.header })),
);
/** The record key a table row belongs to. */
function recOfRow(table: string, row: Row): string | null {
  const info = TABLE_INFO[table];
  if (!info) return null;
  const c = collBy[info.coll];
  if (isList(c)) return row.code != null ? recKey(c.name, row.code) : null;
  const t = tspec(c);
  const v = info.header ? row[t.pk.column] : row[parentKey(t)];
  return v != null ? recKey(c.name, String(v)) : null;
}

/** Records of a collection from its table rows. */
function assemble(c: Coll, byTable: Record<string, Row[]>): { key: string; rec: any; o: number }[] {
  if (isList(c))
    return (byTable[c.spec.table] || []).map((r) => ({
      key: String(r.code),
      rec: rowToList(c.spec as ListSpec, r),
      o: r.sort_order ?? 0,
    }));
  const t = tspec(c);
  const pk = parentKey(t);
  const kids: Record<string, Record<string, Row[]>> = {};
  for (const ch of t.children)
    for (const r of byTable[ch.table] || [])
      ((kids[String(r[pk])] ||= {})[ch.table] ||= []).push(r);
  const heads: [string, Row | null][] = t.headerless
    ? Object.keys(kids).map((k) => [k, null])
    : (byTable[t.table] || []).map((h) => [String(h[t.pk.column]), h]);
  return heads.map(([k, h], i) => ({
    key: k,
    rec: fromPhys(t, h, kids[k] || {}),
    o: h?.sort_order ?? i,
  }));
}

/* ---------------- Applying records to the engine ---------------- */
function replaceInPlace(target: any, src: any) {
  if (Array.isArray(target) && Array.isArray(src)) {
    target.length = 0;
    target.push(...src);
    return;
  }
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, src);
}
function rebuildLookups() {
  for (const k of Object.keys(rmBy)) delete rmBy[k];
  RM.forEach((r: any) => (rmBy[r.code] = r));
  for (const k of Object.keys(fgBy)) delete fgBy[k];
  FG.forEach((f: any) => (fgBy[f.code] = f));
  CHILD_ITEMS.forEach((c: any) => (fgBy[c.code] = c));
  rebuildLists();
}
function findIndex(c: ArrColl, key: string) {
  return c.arr.findIndex((x, j) => recMeta(c, x, j).k === key);
}
function applyRecord(c: Coll, key: string, rec: any, o: number) {
  if (c.kind === "map") {
    if (c.obj[key] && typeof c.obj[key] === "object" && typeof rec === "object")
      replaceInPlace(c.obj[key], rec);
    else c.obj[key] = rec;
    return;
  }
  const i = findIndex(c, key);
  if (i >= 0) {
    replaceInPlace(c.arr[i], rec);
    meta.set(c.arr[i], { k: key, o });
    return;
  }
  meta.set(rec, { k: key, o });
  nextOrder[c.name] = Math.max(nextOrder[c.name] ?? 0, o + 1);
  let at = c.arr.findIndex((x) => (meta.get(x)?.o ?? 0) > o);
  if (at < 0) at = c.arr.length;
  c.arr.splice(at, 0, rec);
}
function removeRecord(c: Coll, key: string) {
  if (c.kind === "map") {
    delete c.obj[key];
    return;
  }
  const i = findIndex(c, key);
  if (i >= 0) c.arr.splice(i, 1);
}
function clearColl(c: Coll) {
  if (c.kind === "array") {
    c.arr.length = 0;
    nextOrder[c.name] = 0;
  } else for (const k of Object.keys(c.obj)) delete c.obj[k];
}
function loadColl(c: Coll, byTable: Record<string, Row[]>) {
  clearColl(c);
  assemble(c, byTable)
    .sort((a, b) => a.o - b.o)
    .forEach((r) => applyRecord(c, r.key, r.rec, r.o));
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
const withNumber = (id: string, n: number) =>
  id.replace(TAIL, (d) => String(n).padStart(d.length, "0"));
const numberOf = (id: string) => +(TAIL.exec(id)?.[1] ?? NaN);
const prefixOf = (id: string) => id.replace(TAIL, "#");

/** Replace `from` with `to` in string values (whole id or as a word inside text). */
function rewrite(v: any, from: string, to: string): any {
  if (typeof v === "string") {
    if (v === from) return to;
    return v.includes(from)
      ? v.replace(
          new RegExp(
            "(^|[^\\w/-])" + from.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "(?![\\w/-])",
            "g",
          ),
          "$1" + to,
        )
      : v;
  }
  if (Array.isArray(v)) {
    v.forEach((x, i) => (v[i] = rewrite(x, from, to)));
    return v;
  }
  if (v && typeof v === "object" && !(v instanceof Date)) {
    for (const k of Object.keys(v)) v[k] = rewrite(v[k], from, to);
    return v;
  }
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
  let n = Math.max(
    numberOf(old) + 1,
    ...c.arr
      .map((x) => String(x[spec.field]))
      .filter((id) => prefixOf(id) === pre)
      .map((id) => numberOf(id) + 1),
  );
  const ctr = spec.counter?.(old);
  if (ctr) n = Math.max(n, ctr[0][ctr[1]] ?? 0);
  while (local.has(withNumber(old, n)) || taken.has(withNumber(old, n))) n++;
  const id = withNumber(old, n);
  if (ctr) ctr[0][ctr[1]] = Math.max(ctr[0][ctr[1]] ?? 0, n + 1);
  // References can only be in records changed here since the last save.
  for (const cc of COLLS)
    for (const [k, r, o] of records(cc)) {
      if (rowsOf(cc, k, r, o).some((x) => saved.get(rowKey(x.table, x.pk)) !== stable(x.row)))
        rewrite(r, old, id);
    }
  rec[spec.field] = id;
  const m = meta.get(rec);
  if (m) m.k = id;
  rebuildLookups();
  notify(`${old} was also created by someone else at the same moment, so yours is now ${id}.`);
  return id;
}
const isUniqueViolation = (e: any) =>
  e?.code === "23505" || /duplicate key/i.test(e?.message || "");
const isDenied = (e: any) =>
  e?.code === "42501" || /row-level security|permission denied/i.test(e?.message || "");

/* ---------------- Sync state ---------------- */
export type SyncStatus = "loading" | "online" | "offline";
export const SYNC: { status: SyncStatus; error: string; lastSaved: Date | null } = {
  status: "loading",
  error: "",
  lastSaved: null,
};
/** Row key → stable JSON of the row as last written to or read from the database. */
const saved = new Map<string, string>();
/** Row key → where that saved row lives (to delete it when its record or line goes away). */
const savedAt = new Map<string, Omit<PRow, "row" | "rec">>();
function setSaved(r: PRow) {
  const k = rowKey(r.table, r.pk);
  saved.set(k, stable(r.row));
  savedAt.set(k, { table: r.table, coll: r.coll, pk: r.pk, header: r.header });
}
function delSaved(k: string) {
  saved.delete(k);
  savedAt.delete(k);
}
/** The sample data as rows, taken before anything changes the engine. */
const SEED = sampleRows();
const tbl = (name: string) => (supabase as any).from(name);
/** Identifies this browser tab, so its own writes echoed back by Realtime are ignored. */
const TAB = newKey();
const writer = () => `${SESSION.user || "-"}|${TAB}`;
const savedCounters: Record<string, number> = {};

async function fetchTable(name: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await tbl(name)
      .select("*")
      .range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}
/** All rows of the given tables (all ERP tables by default), a few requests at a time. */
async function fetchTables(names: string[]): Promise<Record<string, Row[]>> {
  const out: Record<string, Row[]> = {};
  const queue = [...names];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let n = queue.shift(); n; n = queue.shift()) out[n] = await fetchTable(n);
    }),
  );
  return out;
}
const ALL_TABLES = Object.keys(TABLE_INFO);

function applyCounters(rows: Row[]) {
  for (const r of rows) {
    const [m, k] = String(r.name).split(".");
    const tgt = m === "SEQ" ? SEQ : m === "seq" ? (seq as Record<string, number>) : null;
    if (!tgt || !k) continue;
    const v = Number(r.value);
    tgt[k] = Math.max(tgt[k] ?? 0, v);
    savedCounters[r.name] = Math.max(savedCounters[r.name] ?? 0, v);
  }
}
async function saveCounters() {
  const rows: Row[] = [];
  for (const [m, o] of [
    ["SEQ", SEQ],
    ["seq", seq],
  ] as [string, Record<string, number>][])
    for (const [k, v] of Object.entries(o))
      if ((savedCounters[`${m}.${k}`] ?? -1) < v)
        rows.push({ name: `${m}.${k}`, value: v, updated_by: writer() });
  if (!rows.length) return;
  const { error } = await tbl(COUNTERS_TABLE).upsert(rows, { onConflict: "name" });
  if (error) throw error;
  rows.forEach((r) => (savedCounters[r.name] = r.value));
}

/** Remember the engine's rows (of the given collections) as saved. */
function markSaved(only?: Set<string>) {
  if (only)
    for (const [k, a] of [...savedAt]) {
      if (only.has(a.coll)) delSaved(k);
    }
  else {
    saved.clear();
    savedAt.clear();
  }
  currentRows(only).forEach((r) => setSaved(r));
}

/* ---------------- Module rules ---------------- */
// The database refuses changes to tables the user's role may not change (see the module rules
// migration). The app already hides those actions, so this only happens through side effects; the
// change is then undone here so the screen matches the database again.
const LABEL = (c: string) =>
  collBy[c] && isList(collBy[c])
    ? (collBy[c].spec as ListSpec).label.toLowerCase()
    : c.replace(/_/g, " ");
async function revertCollections(colls: Set<string>) {
  const names = [...colls].flatMap((n) => tablesOf(collBy[n]).map((x) => x.table));
  const byTable = await fetchTables(names);
  for (const n of colls) loadColl(collBy[n], byTable);
  rebuildLookups();
  markSaved(colls);
}
async function handleDenied(colls: Set<string>) {
  await revertCollections(colls);
  notify(
    `Your role cannot change ${[...colls].map(LABEL).join(", ")}, so that part of the change was not saved and has been undone.`,
  );
  bump();
}

/* ---------------- Saving ---------------- */
const pkCols = (r: PRow) => Object.keys(r.pk);
async function upsert(table: string, rows: PRow[]) {
  const body = rows.map((r) => ({ ...r.row, updated_by: writer() }));
  for (let i = 0; i < body.length; i += 500) {
    const { error } = await tbl(table).upsert(body.slice(i, i + 500), {
      onConflict: pkCols(rows[0]).join(","),
    });
    if (error) throw error;
  }
}
/** Delete rows; returns false if the database refused (a refused delete removes nothing and reports no error). */
async function remove(table: string, pk: Record<string, any>): Promise<boolean> {
  let qy = tbl(table).delete();
  for (const [k, v] of Object.entries(pk)) qy = qy.eq(k, v);
  const { data, error } = await qy.select(Object.keys(pk).join(","));
  if (error) {
    if (isDenied(error)) return false;
    throw error;
  }
  if (data?.length) return true;
  let chk = tbl(table).select(Object.keys(pk)[0]);
  for (const [k, v] of Object.entries(pk)) chk = chk.eq(k, v);
  const { data: still } = await chk;
  return !still?.length; // still there: the delete was refused
}

/** Insert records that are new here; renumber any whose number is already in the database. */
async function insertNew(denied: Set<string>) {
  let any = false;
  for (const c of COLLS) {
    const spec = NUMBERED[c.name];
    if (!spec || c.kind !== "array" || denied.has(c.name)) continue;
    const t = tspec(c);
    for (const [k0, rec, o] of [...records(c)]) {
      if (saved.has(rowKey(t.table, { [t.pk.column]: k0 }))) continue;
      any = true;
      const taken = new Set<string>();
      for (let tries = 0; ; tries++) {
        const k = String(rec[spec.field]);
        const head = rowsOf(c, k, rec, o).find((r) => r.header)!;
        const { error } = await tbl(t.table).insert({ ...head.row, updated_by: writer() });
        if (!error) {
          setSaved(head);
          break;
        }
        if (isDenied(error)) {
          denied.add(c.name);
          break;
        }
        if (!isUniqueViolation(error) || tries >= 20) throw error;
        taken.add(k);
        renumber(c.name, rec, taken);
      }
    }
  }
  return any;
}

let flushing = false,
  again = false,
  timer: any = null;
async function flush() {
  if (SYNC.status !== "online") return;
  if (flushing) {
    again = true;
    return;
  }
  flushing = true;
  const denied = new Set<string>();
  try {
    if (await insertNew(denied)) bump();
    const cur = currentRows();
    // Upserts by table, in collection order (masters first) so foreign keys are satisfied.
    const up = new Map<string, PRow[]>();
    const del: PRow[] = [];
    cur.forEach((r, k) => {
      if (denied.has(r.coll)) return;
      const s = stable(r.row);
      if (saved.get(k) !== s) {
        if (!up.has(r.table)) up.set(r.table, []);
        up.get(r.table)!.push(r);
      }
    });
    for (const [k, a] of savedAt)
      if (!cur.has(k) && !denied.has(a.coll)) del.push({ ...a, rec: "", row: {} });
    for (const [table, rows] of up) {
      const coll = rows[0].coll;
      if (denied.has(coll)) continue;
      try {
        await upsert(table, rows);
        rows.forEach(setSaved);
      } catch (e) {
        if (!isDenied(e)) throw e;
        denied.add(coll);
      }
    }
    // Line rows first, then whole records (deleting a header removes its lines too).
    del.sort((a, b) => Number(a.header) - Number(b.header));
    for (const d of del) {
      if (denied.has(d.coll)) continue;
      const k = rowKey(d.table, d.pk);
      if (!saved.has(k)) continue; // already gone with its record
      if (!(await remove(d.table, d.pk))) {
        denied.add(d.coll);
        continue;
      }
      delSaved(k);
      if (d.header && !isList(collBy[d.coll])) {
        // Its line rows went with it (ON DELETE CASCADE).
        const t = tspec(collBy[d.coll]);
        for (const [sk, a] of [...savedAt])
          if (!a.header && a.coll === d.coll && a.pk[parentKey(t)] === d.pk[t.pk.column])
            delSaved(sk);
      }
    }
    await saveCounters();
    if (denied.size) await handleDenied(denied);
    if (up.size || del.length) SYNC.lastSaved = new Date();
    SYNC.error = "";
  } catch (e: any) {
    SYNC.error = e?.message || String(e);
    console.error("[MEK-SEL] could not save to the database:", e);
    // Forget what failed so the next change retries it: re-read what the database holds.
    try {
      const byTable = await fetchTables(ALL_TABLES);
      saved.clear();
      savedAt.clear();
      for (const c of COLLS)
        for (const r of assemble(c, byTable)) rowsOf(c, r.key, r.rec, r.o).forEach(setSaved);
    } catch {
      saved.clear();
      savedAt.clear();
    }
    notify(
      "Could not save the last change to the database. It will be retried with your next change.",
    );
  } finally {
    flushing = false;
    if (again) {
      again = false;
      schedule();
    } else if (pendingRemote.size) setTimeout(pullRemote, 0);
  }
}
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(flush, 250);
}

let notifier: (msg: string) => void = (m) => console.warn(m);
export const setSyncNotifier = (fn: (msg: string) => void) => {
  notifier = fn;
};
const notify = (m: string) => notifier(m);

/* ---------------- Changes made by others (Realtime) ---------------- */
const pendingRemote = new Set<string>(); // record keys to re-read
let pullTimer: any = null;
async function pullRemote() {
  if (flushing || !pendingRemote.size) return;
  const keys = [...pendingRemote];
  pendingRemote.clear();
  const byColl = new Map<string, string[]>();
  keys.forEach((k) => {
    const [c, id] = k.split("\u0000");
    if (!byColl.has(c)) byColl.set(c, []);
    byColl.get(c)!.push(id);
  });
  let changed = false;
  try {
    for (const [cn, ids] of byColl) {
      const c = collBy[cn];
      if (!c) continue;
      const byTable: Record<string, Row[]> = {};
      for (const x of tablesOf(c)) {
        const col = isList(c) ? "code" : x.header ? tspec(c).pk.column : parentKey(tspec(c));
        const { data, error } = await tbl(x.table).select("*").in(col, ids);
        if (error) throw error;
        byTable[x.table] = data || [];
      }
      const found = new Map(assemble(c, byTable).map((r) => [r.key, r]));
      for (const id of ids) {
        const r = found.get(id);
        let mine = c.kind === "array" ? c.arr[findIndex(c, id)] : c.obj[id];
        // Rows saved for this record, whatever it holds now.
        const mySaved = [...savedAt]
          .filter(([, a]) => recOfRow(a.table, a.pk) === recKey(cn, id))
          .map(([k]) => k);
        if (!r) {
          // Deleted by someone else: drop it here too, unless it is a new local record not saved yet.
          if (mine !== undefined && mySaved.length) {
            removeRecord(c, id);
            mySaved.forEach(delSaved);
            changed = true;
          }
          continue;
        }
        if (NUMBERED[cn] && mine !== undefined && !mySaved.length) {
          renumber(cn, mine, new Set([id])); // same number, saved first elsewhere: ours moves on
          mine = undefined;
          changed = true;
        }
        const theirs = rowsOf(c, id, r.rec, r.o);
        const now = mine !== undefined ? rowsOf(c, id, mine, r.o) : [];
        mySaved.forEach(delSaved);
        theirs.forEach(setSaved);
        if (
          now.length === theirs.length &&
          now.every((x, i) => stable(x.row) === stable(theirs[i].row))
        )
          continue; // already the same here
        applyRecord(c, id, r.rec, r.o);
        changed = true;
      }
    }
  } catch (e) {
    console.warn("[MEK-SEL] could not read a change made by someone else:", e);
  }
  if (changed) {
    rebuildLookups();
    bump();
  }
}

function subscribeRemote() {
  (supabase as any)
    .channel("erp-tables")
    .on("postgres_changes", { event: "*", schema: "public" }, (p: any) => {
      const table = p.table as string;
      const row = (p.eventType === "DELETE" ? p.old : p.new) || {};
      if (table === COUNTERS_TABLE) {
        if (p.eventType !== "DELETE") {
          applyCounters([row]);
        }
        return;
      }
      if (
        p.eventType !== "DELETE" &&
        typeof row.updated_by === "string" &&
        row.updated_by.endsWith("|" + TAB)
      )
        return; // our own write
      const k = recOfRow(table, row);
      if (!k) return;
      pendingRemote.add(k);
      clearTimeout(pullTimer);
      pullTimer = setTimeout(pullRemote, 150);
    })
    .subscribe();
}

/* ---------------- Start-up ---------------- */
let readyP: Promise<void> | null = null;
/** Load the ERP data from the database once per page load; falls back to sample data offline. */
export function ready(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!readyP) readyP = start();
  return readyP;
}
async function loadEverything() {
  const byTable = await fetchTables([COUNTERS_TABLE, ...ALL_TABLES]);
  for (const c of COLLS) loadColl(c, byTable);
  applyCounters(byTable[COUNTERS_TABLE] || []);
  rebuildLookups();
  markSaved();
  return byTable;
}
async function start() {
  try {
    // The tables are only readable once signed in to Lovable Cloud.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      // Not signed in yet: work from the sample data, and load the database after sign-in.
      SYNC.status = "offline";
      SYNC.error = "Not signed in to Lovable Cloud";
      readyP = null;
      return;
    }
    const { count, error } = await tbl("staff").select("id", { count: "exact", head: true });
    if (error) throw error;
    if (!count) {
      // First run: the sample data becomes the starting point.
      const { error: e2 } = await (supabase as any).rpc("erp_load_sample", {
        payload: SEED,
        wipe: false,
      });
      if (e2 && !/already has data/i.test(e2.message || "")) throw e2;
    }
    await loadEverything();
    SYNC.status = "online";
    onChange(schedule);
    subscribeRemote();
  } catch (e: any) {
    SYNC.status = "offline";
    SYNC.error = e?.message || String(e);
    console.warn("[MEK-SEL] database not available, using sample data in this browser only:", e);
  }
  bump();
}

/** Administrator: empty the database and start again from the sample data. */
export async function resetToSample() {
  const { error } = await (supabase as any).rpc("erp_load_sample", { payload: SEED, wipe: true });
  if (error) throw error;
}

/** Lists screen: the rows of LIST_DATA (re-exported so screens do not import the engine internals). */
export { LIST_DATA };
