// Which engine list or map each database table is stored from. Shared by persist.ts (saving and
// loading) and scripts/gen-db.ts (sample-data SQL). Masters come before the documents that point
// at them, so new records are inserted in an order the foreign keys accept.
import {
  ACTS,
  ADJS,
  BILLS,
  BOM,
  BOMREV,
  CHILD_ITEMS,
  COMBOS,
  CONTACTS,
  CUST,
  DCS,
  DEBITS,
  FG,
  GATES,
  GRNS,
  INDENTS,
  INSTALLED,
  INVOICES,
  LEADS,
  LEDGER,
  LIST_DATA,
  MRS,
  ORDERS,
  POS,
  QUOTES,
  RM,
  ROLES,
  SEQ,
  STAFF,
  TICKETS,
  VENDORS,
  WOS,
  seq,
} from "./engine";
import {
  COUNTERS_TABLE,
  LISTS,
  TABLES,
  listToRow,
  toPhys,
  type ListSpec,
  type Row,
  type TableSpec,
} from "./schema";

export type ArrColl = {
  name: string;
  kind: "array";
  arr: any[];
  key?: (x: any) => string;
  spec: TableSpec | ListSpec;
  list?: boolean;
};
export type MapColl = { name: string; kind: "map"; obj: Record<string, any>; spec: TableSpec };
export type Coll = ArrColl | MapColl;

const byId = (x: any) => x.id;
const byCode = (x: any) => x.code;
const ENGINE: Record<string, any[] | Record<string, any>> = {
  roles: ROLES,
  staff: STAFF,
  customers: CUST,
  contacts: CONTACTS,
  vendors: VENDORS,
  products: FG,
  child_items: CHILD_ITEMS,
  materials: RM,
  bom: BOM,
  bom_versions: BOMREV,
  combos: COMBOS,
  leads: LEADS,
  activities: ACTS,
  quotations: QUOTES,
  sales_orders: ORDERS,
  work_orders: WOS,
  delivery_challans: DCS,
  invoices: INVOICES,
  installed_base: INSTALLED,
  service_tickets: TICKETS,
  indents: INDENTS,
  purchase_orders: POS,
  gate_passes: GATES,
  grns: GRNS,
  requisitions: MRS,
  vendor_bills: BILLS,
  debit_notes: DEBITS,
  stock_ledger: LEDGER,
  stock_adjustments: ADJS,
};
const KEYS: Record<string, ((x: any) => string) | undefined> = {
  products: byCode,
  child_items: byCode,
  materials: byCode,
  installed_base: (x) => x.serial,
  stock_ledger: undefined,
};

/** Save order: lists, then masters, then documents. */
const ORDER = [
  "roles",
  "staff",
  "customers",
  "contacts",
  "vendors",
  "products",
  "child_items",
  "materials",
  "bom",
  "bom_versions",
  "combos",
  "leads",
  "activities",
  "quotations",
  "sales_orders",
  "work_orders",
  "delivery_challans",
  "invoices",
  "installed_base",
  "service_tickets",
  "indents",
  "purchase_orders",
  "gate_passes",
  "grns",
  "requisitions",
  "vendor_bills",
  "debit_notes",
  "stock_ledger",
  "stock_adjustments",
];

export const COLLS: Coll[] = [
  ...LISTS.map((l): Coll => ({
    name: l.coll,
    kind: "array",
    arr: LIST_DATA[l.coll],
    key: byCode,
    spec: l,
    list: true,
  })),
  ...ORDER.map((name): Coll => {
    const spec = TABLES.find((t) => t.coll === name)!;
    const c = ENGINE[name];
    return Array.isArray(c)
      ? { name, kind: "array", arr: c, key: name in KEYS ? KEYS[name] : byId, spec }
      : { name, kind: "map", obj: c as Record<string, any>, spec };
  }),
];
export const collBy: Record<string, Coll> = Object.fromEntries(COLLS.map((c) => [c.name, c]));

/** Key of a stock ledger line in the sample data (they have no id of their own). */
export const sampleLedgerKey = (i: number) => `L${String(i + 1).padStart(5, "0")}`;

/** The engine's current data as rows per table (used for the sample data). */
export function sampleRows(): Record<string, Row[]> {
  const out: Record<string, Row[]> = { [COUNTERS_TABLE]: [] };
  for (const [k, v] of Object.entries(SEQ))
    out[COUNTERS_TABLE].push({ name: "SEQ." + k, value: v });
  for (const [k, v] of Object.entries(seq))
    out[COUNTERS_TABLE].push({ name: "seq." + k, value: v });
  for (const c of COLLS) {
    if (c.kind === "array" && c.list) {
      out[c.spec.table] = c.arr.map((x, i) => listToRow(c.spec as ListSpec, x, i));
      continue;
    }
    const t = c.spec as TableSpec;
    const items: [string, any, number][] =
      c.kind === "array"
        ? c.arr.map((x, i) => [c.key ? c.key(x) : sampleLedgerKey(i), x, i])
        : Object.keys(c.obj).map((k, i) => [k, c.obj[k], i]);
    for (const [k, rec, i] of items) {
      const p = toPhys(t, k, rec, i);
      if (p.header) (out[t.table] ||= []).push(p.header);
      for (const [tbl, rows] of Object.entries(p.kids)) (out[tbl] ||= []).push(...rows);
    }
  }
  return out;
}
