// MEK-SEL ERP database layout: one table per kind of record, with real columns, plus a line table
// for every list inside a document (quotation lines, PO lines, approval history, ...).
//
// This file is the single source of truth for the layout:
//   * scripts/gen-db.ts turns it into the SQL migration and the sample-data SQL;
//   * persist.ts uses it to turn engine records into table rows and back.
//
// Column notation: "field>column:type". The column defaults to the field name in snake_case.
// Types: t text, n numeric, i integer, b boolean, ts timestamptz (a JS Date), d date (a
// YYYY-MM-DD string), ta text[]. A value that does not fit its column, and any field that has no
// column, goes into the row's `extra` jsonb column, so nothing an engine record holds is lost.

export type ColType = "t" | "n" | "i" | "b" | "ts" | "d" | "ta";
export type Col = { field: string; column: string; type: ColType; label: string };

export type ChildSpec = {
  /** Field of the record holding the list (array of objects or tuples, or an object map). */
  field: string;
  table: string;
  kind: "list" | "tuple" | "map";
  /** list: object fields; tuple: one column per position; map: the value column(s). */
  cols: Col[];
  /** map only: column holding the object key. A scalar map value goes into the first value column. */
  keyCol?: Col;
  doc: string;
};

export type TableSpec = {
  /** Engine collection name (also the name used by the module rules). */
  coll: string;
  table: string;
  doc: string;
  /** Primary key: field of the record (or the map key for map collections). */
  pk: Col;
  cols: Col[];
  children: ChildSpec[];
  /** Fields never stored (passwords live in Auth). */
  omit?: string[];
  /** Map collections (engine object keyed by product code): record = { [pk.field]: key, [wrap]: value }. */
  wrap?: string;
  /** Map collections whose value is the whole record (combos), instead of `wrap`. */
  spread?: boolean;
  /** No header table: the record is just its line rows (BOM version log). */
  headerless?: boolean;
  /** Array collections keep their order in a sort_order column. */
  ordered: boolean;
  /** The records have no id of their own; the key is generated and not put back into the record. */
  generatedKey?: boolean;
};

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()).replace(/\./g, "_");
/** Parse "field>column:type|Label, ..." */
function cols(src: string): Col[] {
  return src
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [main, label] = s.split("|");
      const [fc, type] = main.split(":");
      const [field, column] = fc.split(">");
      return {
        field,
        column: column || snake(field),
        type: (type || "t") as ColType,
        label: label || "",
      };
    });
}
const col = (src: string) => cols(src)[0];

const HISTORY = (table: string, doc: string): ChildSpec => ({
  field: "history",
  table,
  kind: "list",
  doc,
  cols: cols("at>at:ts, time>at_time:t, by>by_staff_id:t, act>action:t, note:t, cls>tone:t"),
});

function T(
  coll: string,
  table: string,
  doc: string,
  pk: string,
  colSrc: string,
  children: ChildSpec[] = [],
  more: Partial<TableSpec> = {},
): TableSpec {
  return { coll, table, doc, pk: col(pk), cols: cols(colSrc), children, ordered: true, ...more };
}
function L(
  field: string,
  table: string,
  colSrc: string,
  doc: string,
  kind: ChildSpec["kind"] = "list",
  keyCol?: string,
): ChildSpec {
  return { field, table, kind, cols: cols(colSrc), doc, keyCol: keyCol ? col(keyCol) : undefined };
}

/* ---------------- Transaction and master tables ---------------- */
export const TABLES: TableSpec[] = [
  // Administration
  T(
    "roles",
    "roles",
    "Role master: what each role may see, change and approve.",
    "id:t",
    "name:t, desc>description:t, system>is_system:b",
    [
      L(
        "perms",
        "role_permissions",
        "access:t",
        "Access per module: none, view or full.",
        "map",
        "module:t",
      ),
      L(
        "approvals",
        "role_approvals",
        "allowed:b",
        "Approval rights of the role.",
        "map",
        "approval:t",
      ),
    ],
  ),
  T(
    "staff",
    "staff",
    "Staff master. Logins are Lovable Cloud accounts linked by staff id.",
    "id:t",
    "code>employee_code:t, name:t, designation:t, dept>department:t, role>role_id:t, mobile:t, email:t, doj>date_joined:d, username:t, active:b",
    [],
    { omit: ["password", "lastLogin"] },
  ),

  // Sales & CRM
  T(
    "customers",
    "customers",
    "Customer master.",
    "id:t",
    "name:t, city:t, country:t, state:t, gstin:t, addr>address:t, contact:t, creditDays>credit_days:n, creditLimit>credit_limit:n",
  ),
  T(
    "contacts",
    "customer_contacts",
    "People at each customer.",
    "id:t",
    "cust>customer_id:t, name:t, desig>designation:t, role>contact_role:t, mobile:t, email:t, primary>is_primary:b",
  ),
  T(
    "leads",
    "leads",
    "Sales leads (enquiries).",
    "id:t",
    "cust>customer_id:t, item>item_code:t, qty:n, source:t, stage:t, follow>follow_up_on:ts, note:t, value:n",
  ),
  T(
    "activities",
    "activities",
    "CRM activities: calls, visits, e-mails and open follow-ups.",
    "id:t",
    "type>activity_type:t, status:t, cust>customer_id:t, contact>contact_id:t, ref>reference:t, subject:t, notes:t, outcome:t, date>done_on:ts, due>due_on:ts, by>owner_id:t, promise.date>promise_date:ts, promise.amt>promise_amount:n",
  ),
  T(
    "quotations",
    "quotations",
    "Quotations with discount approval.",
    "id:t",
    "cust>customer_id:t, date>quote_date:ts, by>prepared_by:t, disc>discount_pct:n, status:t, lead>lead_id:t, so>sales_order_id:t, dropStd>dropped_standard_items:ta",
    [
      L(
        "lines",
        "quotation_lines",
        "item>item_code:t, qty:n, price:n, list>list_price:n, pi>parent_line:i, incl>price_included:b, std>standard_scope:b",
        "Items quoted. Child items point to their main item with parent_line.",
      ),
      HISTORY("quotation_history", "Approval trail of the quotation."),
    ],
  ),
  T(
    "sales_orders",
    "sales_orders",
    "Sales orders from customer POs.",
    "id:t",
    "cust>customer_id:t, date>order_date:ts, due>due_date:ts, disc>discount_pct:n, advance>advance_received:b, advanceAmt>advance_amount:n, advancePct>advance_pct:n, dispatched:b, dispatchDate>dispatched_on:ts, custPO>customer_po:t, custPODate>customer_po_date:ts, credit>on_credit:b, quote>quotation_id:t",
    [
      L(
        "lines",
        "sales_order_lines",
        "item>item_code:t, qty:n, price:n, disp>dispatched_qty:n, list>list_price:n, pi>parent_line:i, incl>price_included:b, std>standard_scope:b",
        "Items ordered and how many have been dispatched.",
      ),
      L(
        "payments",
        "sales_order_payments",
        "date>paid_on:ts, amt>amount:n, mode:t, ref>reference:t",
        "Advance payments received against the order.",
      ),
    ],
  ),
  T(
    "invoices",
    "invoices",
    "GST tax invoices raised at dispatch.",
    "id:t",
    "date>invoice_date:ts, due>due_date:ts, so>sales_order_id:t, cust>customer_id:t, custPO>customer_po:t, sup>supply_type:t, taxable:n, cgst:n, sgst:n, igst:n, tax:n, roundOff>round_off:n, total:n, advAdj>advance_adjusted:n, dc>delivery_challan_id:t, vehicle:t, transporter:t, lr>lr_number:t, ewb>eway_bill:t, sb>shipping_bill:t",
    [
      L(
        "lines",
        "invoice_lines",
        "item>item_code:t, hsn:t, qty:n, list>list_price:n, disc>discount_pct:n, rate:n, taxable:n, incl>price_included:b, kid>is_child_item:b",
        "Invoiced items.",
      ),
      L(
        "pays",
        "invoice_payments",
        "date>paid_on:ts, amt>amount:n, mode:t, ref>reference:t",
        "Customer payments against the invoice.",
      ),
    ],
  ),
  T(
    "delivery_challans",
    "delivery_challans",
    "Delivery challans (dispatches).",
    "id:t",
    "date>dc_date:ts, so>sales_order_id:t, inv>invoice_id:t, vehicle:t, transporter:t, lr>lr_number:t, ewb>eway_bill:t, sb>shipping_bill:t",
    [
      L(
        "lines",
        "delivery_challan_lines",
        "item>item_code:t, qty:n, ln>order_line:i",
        "Items dispatched.",
      ),
    ],
  ),
  T(
    "installed_base",
    "installed_machines",
    "Machines installed at customers, with warranty and AMC.",
    "serial>serial_no:t",
    "item>item_code:t, cust>customer_id:t, installed>installed_on:ts, amcTo>amc_until:ts, warranty>under_warranty:b, pending>installation_pending:b, so>sales_order_id:t, dc>delivery_challan_id:t, engineer>engineer_id:t, trained>operators_trained:b",
  ),
  T(
    "service_tickets",
    "service_tickets",
    "Service calls on installed machines.",
    "id:t",
    "serial>serial_no:t, issue:t, opened>opened_on:ts, status:t",
  ),

  // Engineering
  T(
    "products",
    "products",
    "Finished goods: machines and change parts.",
    "code:t",
    "name:t, family:t, sub>sub_family:t, kind:t, price:n, hsn:t, url:t, flag>note:t",
    [L("specs", "product_specs", "label:t, value:t", "Published specifications.", "tuple")],
  ),
  T(
    "child_items",
    "child_items",
    "Spares, accessories, documents and services sold with a main item.",
    "code:t",
    "name:t, family:t, kind:t, src>source:t, price:n, hsn:t, sub>description:t, url:t",
    [L("specs", "child_item_specs", "label:t, value:t", "Specifications.", "tuple")],
  ),
  T(
    "materials",
    "materials",
    "Raw material master with stock levels.",
    "code:t",
    "name:t, cat>category_id:i, uom:t, rate:n, onHand>on_hand:n, reorder>reorder_level:n, max>max_level:n, lead>lead_days:n, bin:t, vendor>vendor_id:t, service>is_job_work:b",
    [
      L(
        "alt",
        "material_units",
        "u>unit:t, f>factor:n",
        "Alternative units: 1 unit = factor × base unit.",
      ),
    ],
  ),
  T(
    "bom",
    "boms",
    "Bill of materials header (one per product).",
    "product>product_code:t",
    "",
    [
      L(
        "lines",
        "bom_lines",
        "group_name:t, material_code:t, qty:n",
        "Material per sub-assembly for one product.",
        "tuple",
      ),
    ],
    { wrap: "lines", ordered: false },
  ),
  T(
    "bom_versions",
    "bom_versions",
    "BOM release log.",
    "product>product_code:t",
    "",
    [
      L(
        "versions",
        "bom_versions",
        "ver>version:i, at>released_at:ts, by>released_by:t, note:t, n>line_count:i",
        "One row per BOM release.",
      ),
    ],
    { wrap: "versions", headerless: true, ordered: false },
  ),
  T(
    "combos",
    "combo_sets",
    "Combo set: the standard and optional scope sold with a main item.",
    "product>product_code:t",
    "rev>revision:i",
    [
      L(
        "lines",
        "combo_set_lines",
        "item>item_code:t, qty:n, std>standard_scope:n, incl>price_included:n, note:t",
        "Child items of the set. 1 = yes, 0 = no.",
      ),
      L("hist", "combo_set_history", "at:ts, by>by_staff_id:t, note:t", "Changes to the set."),
    ],
    { spread: true, ordered: false },
  ),

  // Operations
  T(
    "work_orders",
    "work_orders",
    "Work orders for machines and change parts.",
    "id:t",
    "so>sales_order_id:t, item>item_code:t, qty:n, stage:i, issued>material_issued:b, ln>order_line:i",
  ),

  // Purchase
  T(
    "vendors",
    "vendors",
    "Vendor master.",
    "id:t",
    "name:t, city:t, supplies:t, state:t, gstin:t, contact:t, phone:t, email:t, terms>payment_terms_days:n, active:b, msme>is_msme:b, udyam>udyam_no:t",
  ),
  T(
    "indents",
    "indents",
    "Purchase indents (requests to buy).",
    "id:t",
    "date>indent_date:ts, by>raised_by:t, dept>department:t, source:t, needBy>need_by:ts, reason:t, status:t",
    [
      L(
        "lines",
        "indent_lines",
        "rm>material_code:t, qty:n, appr>approved_qty:n, po>ordered_qty:n",
        "Materials requested.",
      ),
      HISTORY("indent_history", "Approval trail of the indent."),
    ],
  ),
  T(
    "purchase_orders",
    "purchase_orders",
    "Purchase orders to vendors.",
    "id:t",
    "date>po_date:ts, vendor>vendor_id:t, indent>indent_id:t, due>due_date:ts, status:t, reason:t",
    [
      L(
        "lines",
        "purchase_order_lines",
        "rm>material_code:t, qty:n, rate:n, recv>received_qty:n, rej>rejected_qty:n, ou>order_unit:t, of>unit_factor:n, oq>order_qty:n, orate>order_rate:n",
        "Materials ordered (qty and rate in stock units; order_* in the unit ordered).",
      ),
      HISTORY("purchase_order_history", "Approval trail of the PO."),
    ],
  ),
  T(
    "gate_passes",
    "gate_passes",
    "Gate entries (in) and gate passes (out).",
    "id:t",
    "dir>direction:t, date>pass_date:ts, po>purchase_order_id:t, party>party_id:t, vehicle:t, dc>party_document:t, status:t, grn>grn_id:t, returnable:b, purpose:t, expBack>expected_back:ts, ref>reference:t",
    [
      L(
        "lines",
        "gate_pass_lines",
        "rm>material_code:t, qty:n, back>returned_qty:n, gateRej>rejected_at_gate:n, gateReason>rejection_reason:t, ru>arrived_unit:t, rq>arrived_unit_qty:n, rrq>rejected_unit_qty:n",
        "Material through the gate.",
      ),
      HISTORY("gate_pass_history", "Trail of the gate entry or pass."),
    ],
  ),
  T(
    "grns",
    "grns",
    "Goods receipt notes with QC acceptance.",
    "id:t",
    "date>grn_date:ts, gate>gate_entry_id:t, po>purchase_order_id:t, party>vendor_id:t, by>received_by:t, status:t, returnPass>return_pass_id:t",
    [
      L(
        "lines",
        "grn_lines",
        "rm>material_code:t, recv>received_qty:n, acc>accepted_qty:n, rej>rejected_qty:n, reason>rejection_reason:t, billed>billed_qty:n, cnt>counted_qty:n, cu>counted_unit:t, theo>theoretical_qty:n, wkg>weighed_kg:n, var>weight_variance_pct:n",
        "Material received and inspected.",
      ),
      HISTORY("grn_history", "QC trail of the GRN."),
    ],
  ),
  T(
    "vendor_bills",
    "vendor_bills",
    "Vendor bills with 3-way match.",
    "id:t",
    "vinv>vendor_invoice_no:t, vdate>vendor_invoice_date:ts, date>booked_on:ts, vendor>vendor_id:t, grn>grn_id:t, po>purchase_order_id:t, status:t, match>match_status:t, approvedTotal>approved_total:n",
    [
      L(
        "lines",
        "vendor_bill_lines",
        "rm>material_code:t, qty:n, rate:n, poRate>po_rate:n, accQty>accepted_qty:n, amt>billed_amount:n, bu>billed_unit:t, bq>billed_unit_qty:n, brate>billed_unit_rate:n",
        "Billed materials.",
      ),
      L(
        "pays",
        "vendor_bill_payments",
        "date>paid_on:ts, amt>amount:n, mode:t, ref>reference:t",
        "Payments to the vendor.",
      ),
      HISTORY("vendor_bill_history", "Trail of the bill."),
    ],
  ),
  T(
    "debit_notes",
    "debit_notes",
    "Debit notes raised on vendors.",
    "id:t",
    "date>note_date:ts, vendor>vendor_id:t, ref>vendor_bill_id:t, reason:t, taxable:n, tax:n, total:n",
  ),

  // Stores
  T(
    "requisitions",
    "material_requisitions",
    "Material requisitions from the shop floor.",
    "id:t",
    "date>requested_on:ts, by>requested_by:t, wo>work_order_id:t, purpose:t, status:t, prevStatus>previous_status:t",
    [
      L(
        "lines",
        "material_requisition_lines",
        "rm>material_code:t, qty:n, appr>approved_qty:n, iss>issued_qty:n, rcv>received_qty:n, rrej>returned_qty:n, rreason>return_reason:t, ind>indent_id:t",
        "Materials requested, approved, issued and confirmed.",
      ),
      HISTORY("material_requisition_history", "Approval and issue trail."),
    ],
  ),
  T(
    "stock_ledger",
    "stock_ledger",
    "Every stock movement with the running balance.",
    "id:t",
    "at>posted_at:ts, time>posted_time:t, rm>material_code:t, type>movement_type:t, ref>reference:t, qin>qty_in:n, qout>qty_out:n, bal>balance:n, by>posted_by:t",
    [],
    { generatedKey: true },
  ),
  T(
    "stock_adjustments",
    "stock_adjustments",
    "Stock adjustments after a physical count.",
    "id:t",
    "date>adjusted_on:ts, by>raised_by:t, rm>material_code:t, system>system_qty:n, counted>counted_qty:n, reason:t, status:t",
    [HISTORY("stock_adjustment_history", "Approval trail.")],
  ),
];

/* ---------------- Lists (editable masters for drop-downs) ---------------- */
export type ListSpec = {
  coll: string;
  table: string;
  label: string;
  group: string;
  doc: string;
  cols: Col[];
  modules: string[];
};
const LIST = (
  coll: string,
  label: string,
  group: string,
  doc: string,
  colSrc: string,
  modules: string[],
): ListSpec => ({
  coll,
  table: coll,
  label,
  group,
  doc,
  cols: cols("code:t|Code, " + colSrc),
  modules,
});

export const LISTS: ListSpec[] = [
  LIST(
    "material_categories",
    "Material categories",
    "Materials",
    "Raw material categories with their default store, lead time and vendor.",
    "name:t|Category, bin:t|Store location, lead>lead_days:n|Lead time (days), vendor>vendor_id:t|Default vendor",
    ["materials", "inventory", "stores"],
  ),
  LIST("uoms", "Units of measure", "Materials", "Stock units for raw materials.", "name:t|Unit", [
    "materials",
    "inventory",
    "stores",
  ]),
  LIST(
    "lead_sources",
    "Lead sources",
    "Sales & CRM",
    "Where enquiries come from.",
    "name:t|Source",
    ["leads", "crm", "customers"],
  ),
  LIST(
    "lead_stages",
    "Lead stages",
    "Sales & CRM",
    "Stages on the lead board. New, Quoted, Won and Lost drive the workflow.",
    "name:t|Stage",
    ["leads", "crm"],
  ),
  LIST(
    "activity_types",
    "Activity types",
    "Sales & CRM",
    "Kinds of CRM activity.",
    "name:t|Activity type",
    ["crm", "leads"],
  ),
  LIST(
    "contact_roles",
    "Contact roles",
    "Sales & CRM",
    "Role of a customer contact in buying.",
    "name:t|Contact role",
    ["crm", "customers", "leads"],
  ),
  LIST(
    "departments",
    "Departments",
    "Company",
    "Departments for staff and indents.",
    "name:t|Department",
    ["staff", "roles"],
  ),
  LIST(
    "designations",
    "Designations",
    "Company",
    "Job titles offered in the staff form.",
    "name:t|Designation",
    ["staff", "roles"],
  ),
  LIST(
    "states",
    "States (GST)",
    "Company",
    "Indian states with their GST state codes.",
    "name:t|State, gstCode>gst_code:t|GST code",
    ["staff", "roles", "customers", "vendors"],
  ),
  LIST(
    "company",
    "Company profile",
    "Company",
    "Name, address and GSTIN printed on invoices and POs.",
    "name:t|Company name, addr>address:t|Address, state:t|State, stateCode>state_code:t|GST state code, gstin:t|GSTIN, gstRate>gst_rate:n|GST rate (%)",
    ["staff", "roles"],
  ),
  LIST(
    "product_families",
    "Product families",
    "Engineering",
    "Families for finished goods and child items.",
    "name:t|Family",
    ["products", "combos", "bom"],
  ),
  LIST(
    "bom_groups",
    "BOM groups",
    "Engineering",
    "Sub-assemblies used to group BOM lines.",
    "name:t|Group",
    ["bom", "products"],
  ),
  LIST(
    "item_kinds",
    "Item kinds",
    "Engineering",
    "Kinds of sellable item. Machine and change part drive work orders.",
    "name:t|Label",
    ["products", "combos", "bom"],
  ),
];

/** Document counters (next numbers), shared by everyone. */
export const COUNTERS_TABLE = "doc_counters";

export const tableOf = (coll: string) => TABLES.find((t) => t.coll === coll) || null;
export const listOf = (coll: string) => LISTS.find((l) => l.coll === coll) || null;

/* ---------------- Records ⇄ rows ---------------- */
export type Row = Record<string, any>;
export type Phys = { header: Row | null; kids: Record<string, Row[]> };

const get = (o: any, path: string) =>
  path.split(".").reduce((v, k) => (v == null ? undefined : v[k]), o);
function set(o: any, path: string, v: any) {
  const ks = path.split(".");
  let t = o;
  ks.slice(0, -1).forEach((k) => {
    if (t[k] == null || typeof t[k] !== "object") t[k] = {};
    t = t[k];
  });
  t[ks[ks.length - 1]] = v;
}
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** The column value for an engine value, or undefined when it does not fit the column type. */
function toCol(v: any, type: ColType): any {
  if (v === null || v === undefined) return null;
  switch (type) {
    case "t":
      return typeof v === "string" ? v : undefined;
    case "n":
      return typeof v === "number" && isFinite(v) ? v : undefined;
    case "i":
      return typeof v === "number" && Number.isInteger(v) ? v : undefined;
    case "b":
      return typeof v === "boolean" ? v : undefined;
    case "ts":
      return v instanceof Date && !isNaN(+v) ? v.toISOString() : undefined;
    case "d":
      return typeof v === "string" && DAY.test(v) ? v : undefined;
    case "ta":
      return Array.isArray(v) && v.every((x) => typeof x === "string") ? v : undefined;
  }
}
function fromCol(v: any, type: ColType): any {
  if (v === null || v === undefined) return undefined;
  if (type === "ts") return new Date(v);
  if (type === "n" || type === "i") return typeof v === "string" ? Number(v) : v;
  return v;
}
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
/** JSON for the extra column: dates as ISO strings, revived on load. */
export function toJsonValue(v: any): any {
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(toJsonValue);
  if (v && typeof v === "object") {
    const o: any = {};
    for (const k of Object.keys(v)) if (v[k] !== undefined) o[k] = toJsonValue(v[k]);
    return o;
  }
  return v;
}
export function revive(v: any): any {
  if (typeof v === "string") return ISO.test(v) ? new Date(v) : v;
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === "object") {
    const o: any = {};
    for (const k of Object.keys(v)) o[k] = revive(v[k]);
    return o;
  }
  return v;
}

/** Columns from an object; whatever has no column (or does not fit) is returned in extra. */
function packObj(src: any, cs: Col[], skip: string[] = []): { row: Row; extra: any } {
  const row: Row = {};
  const rest: any = { ...src };
  skip.forEach((k) => delete rest[k]);
  const extra: any = {};
  for (const c of cs) {
    const v = get(src, c.field);
    const cv = toCol(v, c.type);
    row[c.column] = cv === undefined ? null : cv;
    if (cv === undefined) set(extra, c.field, v);
    // drop the field (or the path's leaf) from the rest
    const top = c.field.split(".")[0];
    if (c.field.includes(".")) {
      const sub = rest[top];
      if (sub && typeof sub === "object" && !Array.isArray(sub) && !(sub instanceof Date)) {
        const copy = { ...sub };
        delete copy[c.field.split(".").slice(1).join(".")];
        if (Object.keys(copy).length) rest[top] = copy;
        else delete rest[top];
      }
    } else delete rest[top];
  }
  for (const k of Object.keys(rest)) if (rest[k] !== undefined) extra[k] = rest[k];
  return { row, extra };
}
function unpackObj(row: Row, cs: Col[]): any {
  const o: any = {};
  for (const c of cs) {
    const v = fromCol(row[c.column], c.type);
    if (v !== undefined) set(o, c.field, v);
  }
  const ex = row.extra ? revive(row.extra) : null;
  if (ex) merge(o, ex);
  return o;
}
function merge(t: any, s: any) {
  for (const k of Object.keys(s)) {
    if (
      s[k] &&
      typeof s[k] === "object" &&
      !Array.isArray(s[k]) &&
      !(s[k] instanceof Date) &&
      t[k] &&
      typeof t[k] === "object" &&
      !Array.isArray(t[k])
    )
      merge(t[k], s[k]);
    else t[k] = s[k];
  }
}
const extraCol = (extra: any) => (Object.keys(extra).length ? toJsonValue(extra) : null);

const singular = (t: string) =>
  t.endsWith("sses") ? t.slice(0, -2) : t.endsWith("s") ? t.slice(0, -1) : t;
/** Column of a line row that links it to its record: quotation_id, product_code, ... */
export const parentKey = (t: TableSpec) =>
  t.pk.column === "id" || t.pk.column === "code"
    ? `${singular(t.table)}_${t.pk.column}`
    : t.pk.column;

/** A record as table rows. `order` is its position in the engine list. */
export function toPhys(t: TableSpec, key: string, rec: any, order: number): Phys {
  const body = t.wrap ? { [t.wrap]: rec } : rec;
  const skip = [...(t.omit || []), ...t.children.map((c) => c.field), t.pk.field];
  const kids: Record<string, Row[]> = {};
  for (const c of t.children) {
    const v = body[c.field];
    const rows: Row[] = [];
    if (c.kind === "map") {
      if (v && typeof v === "object")
        Object.keys(v).forEach((k, i) => {
          const val = v[k];
          const cv = toCol(val, c.cols[0].type);
          rows.push({
            [parentKey(t)]: key,
            [c.keyCol!.column]: k,
            [c.cols[0].column]: cv === undefined ? null : cv,
            line_no: i,
            extra: cv === undefined ? toJsonValue({ value: val }) : null,
          });
        });
    } else if (Array.isArray(v))
      v.forEach((item: any, i: number) => {
        if (c.kind === "tuple") {
          const row: Row = { [parentKey(t)]: key, line_no: i };
          const extra: any = {};
          c.cols.forEach((cc, j) => {
            const cv = toCol(item?.[j], cc.type);
            row[cc.column] = cv === undefined ? null : cv;
            if (cv === undefined && item?.[j] !== undefined) extra[j] = item[j];
          });
          if (Array.isArray(item) && item.length > c.cols.length)
            extra.more = item.slice(c.cols.length);
          if (!Array.isArray(item)) extra.value = item;
          row.extra = extraCol(extra);
          rows.push(row);
        } else {
          const { row, extra } = packObj(item ?? {}, c.cols);
          if (item === null || typeof item !== "object") extra.value = item;
          rows.push({ [parentKey(t)]: key, line_no: i, ...row, extra: extraCol(extra) });
        }
      });
    kids[c.table] = rows;
  }
  if (t.headerless) return { header: null, kids };
  const { row, extra } = packObj(body, t.cols, skip);
  const header: Row = { [t.pk.column]: key, ...row, extra: extraCol(extra) };
  if (t.ordered) header.sort_order = order;
  // Children that are missing or not a list/map are kept in extra so they come back as they were.
  for (const c of t.children) {
    const v = body[c.field];
    if (v !== undefined && !(c.kind === "map" ? v && typeof v === "object" : Array.isArray(v)))
      header.extra = toJsonValue({ ...(header.extra || {}), [c.field]: v });
  }
  return { header, kids };
}

/** Rows back into the engine record. */
export function fromPhys(t: TableSpec, header: Row | null, kids: Record<string, Row[]>): any {
  const body: any = header ? unpackObj(header, t.cols) : {};
  for (const c of t.children) {
    const rows = (kids[c.table] || []).slice().sort((a, b) => a.line_no - b.line_no);
    if (header?.extra && c.field in header.extra) continue; // stored as-is
    if (c.kind === "map") {
      const o: any = {};
      rows.forEach((r) => {
        o[r[c.keyCol!.column]] =
          r.extra && "value" in r.extra
            ? revive(r.extra.value)
            : fromCol(r[c.cols[0].column], c.cols[0].type);
      });
      if (header || rows.length) body[c.field] = o;
    } else if (c.kind === "tuple") {
      body[c.field] = rows.map((r) => {
        if (r.extra && "value" in r.extra) return revive(r.extra.value);
        const arr = c.cols.map((cc, j) =>
          r.extra && j in r.extra ? revive(r.extra[j]) : fromCol(r[cc.column], cc.type),
        );
        while (arr.length && arr[arr.length - 1] === undefined) arr.pop();
        return r.extra?.more ? [...arr, ...revive(r.extra.more)] : arr;
      });
    } else {
      body[c.field] = rows.map((r) =>
        r.extra &&
        "value" in r.extra &&
        Object.keys(r.extra).length === 1 &&
        c.cols.every((cc) => r[cc.column] == null)
          ? revive(r.extra.value)
          : unpackObj(r, c.cols),
      );
    }
  }
  if (t.wrap) return body[t.wrap];
  if (header) {
    const k = fromCol(header[t.pk.column], t.pk.type);
    if (!t.spread && !t.generatedKey) set(body, t.pk.field, k);
  }
  return body;
}

/** A list row (lookup master) as a table row and back. */
export function listToRow(l: ListSpec, rec: any, order: number): Row {
  const { row, extra } = packObj(rec, l.cols);
  return { ...row, sort_order: order, extra: extraCol(extra) };
}
export const rowToList = (l: ListSpec, row: Row) => unpackObj(row, l.cols);
