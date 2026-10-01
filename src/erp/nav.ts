// Sidebar structure, navigation helper and the little counters on menu items.
import {
  INDENTS, POS, GATES, GRNS, MRS, ADJS, BILLS, INVOICES, INSTALLED, QUOTES, LEADS, WOS, PEND, QS,
  storesInbox, planRows, invBal, openOrders, woStages, readyLines,
} from "./engine";
import { daysFrom } from "./format";
import { canApprove, canEdit, isAdmin } from "./session";

export type RouteKey = string;
export const ROUTES: { group: string; items: [RouteKey, string, string][] }[] = [
  { group: "Overview", items: [["dashboard", "Dashboard", "dash"]] },
  { group: "Sales & CRM", items: [["leads", "Leads", "lead"], ["crm", "CRM desk", "cust"], ["customers", "Customers", "cust"], ["quotes", "Quotations", "quote"], ["orders", "Sales orders", "order"], ["invoices", "Invoices", "inv"]] },
  { group: "Engineering", items: [["products", "Product master", "fg"], ["combos", "Combo sets", "bom"], ["bom", "Bill of materials", "bom"], ["materials", "Raw material master", "rm"]] },
  { group: "Operations", items: [["forecast", "Demand forecast", "dash"], ["mrp", "Material planning", "mrp"], ["workorders", "Work orders", "wo"], ["dispatch", "Dispatch", "ship"]] },
  { group: "Purchase & stores", items: [["purchase", "Purchase overview", "mrp"], ["vendors", "Vendors", "cust"], ["indent", "Indents", "indent"], ["po", "Purchase orders", "cart"], ["gate", "Gate pass", "gate"], ["grn", "Goods receipt (GRN)", "grn"], ["bills", "Vendor bills", "inv"]] },
  { group: "Stores", items: [["stores", "Stores desk", "rm"], ["inventory", "Inventory", "bom"], ["planning", "Procurement planning", "mrp"], ["mr", "Material requisition", "mrq"]] },
  { group: "Finance", items: [["receivables", "Receivables", "inv"], ["payables", "Payables", "cart"]] },
  { group: "After-sales", items: [["service", "Installed base & service", "svc"]] },
  { group: "Administration", items: [["staff", "Staff master", "staff"], ["roles", "Role master", "key"], ["lists", "Lists & settings", "bom"]] },
  { group: "Help", items: [["help", "Help & guides", "help"]] },
];

export const routeName = (r: string): [string, string] => {
  for (const g of ROUTES) for (const i of g.items) if (i[0] === r) return [g.group, i[1]];
  return ["", ""];
};

// Navigation is wired to the TanStack router by the app shell.
let navigator: (r: string) => void = () => {};
export const setNavigator = (fn: (r: string) => void) => {
  navigator = fn;
};
export const go = (r: string) => navigator(r);

export function navCount(r: string): number {
  const pc = (t: string, list: any[], st: string) => (canApprove(t) ? list.filter((d) => d.status === st).length : 0);
  if (r === "indent") return pc("indent", INDENTS, PEND);
  if (r === "po") return pc("po", POS, PEND);
  if (r === "gate") return canApprove("gate") ? GATES.filter((g: any) => g.status === PEND).length : 0;
  if (r === "grn")
    return canApprove("grn")
      ? GRNS.filter((g: any) => g.status === "Pending QC approval").length
      : canEdit("grn")
        ? GATES.filter((g: any) => g.dir === "in" && g.status === "Awaiting GRN").length
        : 0;
  if (r === "mr")
    return canApprove("mr")
      ? MRS.filter((m: any) => m.status === PEND).length
      : canEdit("mr")
        ? MRS.filter((m: any) => ["Approved", "Partly approved", "Partly issued"].includes(m.status)).length
        : 0;
  if (r === "stores") return canEdit("stores") ? storesInbox().filter((x: any) => x[0] === "warn" || x[0] === "bad").length : 0;
  if (r === "inventory") return canApprove("adj") ? ADJS.filter((a: any) => a.status === PEND).length : 0;
  if (r === "planning") return canEdit("planning") ? planRows().filter((x: any) => x.sug > 0).length : 0;
  if (r === "bills") return canApprove("bills") ? BILLS.filter((b: any) => b.status === PEND).length : 0;
  if (r === "invoices") return canEdit("invoices") ? INVOICES.filter((v: any) => invBal(v) > 0 && daysFrom(v.due) < 0).length : 0;
  if (r === "service") return canEdit("service") ? INSTALLED.filter((i: any) => i.pending).length : 0;
  if (r === "quotes")
    return isAdmin()
      ? QUOTES.filter((q: any) => q.status === QS.pend).length
      : QUOTES.filter((q: any) => q.status === QS.clar || q.status === QS.appr).length;
  if (r === "leads") return LEADS.filter((l: any) => l.stage !== "Won" && l.stage !== "Lost").length;
  if (r === "orders") return openOrders().length;
  if (r === "workorders") return WOS.filter((w: any) => w.stage < woStages(w).length - 1).length;
  if (r === "dispatch") return openOrders().filter((o: any) => readyLines(o).length).length;
  return 0;
}
