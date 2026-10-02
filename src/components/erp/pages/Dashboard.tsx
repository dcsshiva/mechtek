import {
  LEADS, QUOTES, ORDERS, WOS, INSTALLED, TICKETS, INDENTS, POS, GATES, GRNS, MRS, ADJS, BILLS, INVOICES, QS, PEND, DISC_LIMIT,
  apOpen, amcStatus, arOpen, custBy, fgBy, invBal, leadValue, mrp, openFollowups, openOrders, orderStatus, orderValue,
  promiseOf, quoteValue, storesInbox, venBy, woStages,
} from "@/erp/engine";
import { SESSION } from "@/erp/engine";
import { TODAY, daysFrom, ds, inr, inrShort, qfmt } from "@/erp/format";
import { canApprove, canEdit, canSee, isAdmin, me, myRole } from "@/erp/session";
import { useErp } from "@/erp/store";
import { go, routeName } from "@/erp/nav";
import { Modal, PageHead, Pill, Stages, closeModal, openModal } from "../ui";
import { OrdersTable } from "./common";
import { openLead } from "./Leads";
import { OrderDetail } from "./Orders";
import { QuoteDetail } from "./Quotes";

type Att = [string, string, string, string];
type BreakdownRow = { label: string; detail: string; value?: string; open: () => void };

function breakdown(title: string, rows: BreakdownRow[]) {
  openModal(
    <Modal title={title} wide>
      <div className="breakdown-list">
        {rows.length ? rows.map((row, i) => (
          <button key={i} type="button" className="breakdown-row" onClick={row.open}>
            <span><strong>{row.label}</strong><span className="cell-sub">{row.detail}</span></span>
            <span className="breakdown-end">{row.value && <strong>{row.value}</strong>}<span aria-hidden="true">→</span></span>
          </button>
        )) : <p className="empty">No matching records.</p>}
      </div>
    </Modal>,
  );
}

function visit(route: string) { closeModal(); go(route); }
function orderRow(o: any): BreakdownRow {
  return { label: o.id, detail: `${custBy(o.cust).name} · ${o.lines.map((l: any) => `${l.qty} × ${fgBy[l.item].name}`).join(", ")}`, value: inrShort(orderValue(o)), open: () => openModal(<OrderDetail id={o.id} />) };
}

function DashboardKpi({ label, value, foot, tone = "", onClick }: { label: string; value: string | number; foot: string; tone?: string; onClick: () => void }) {
  return <button type="button" className={`kpi kpi-action ${tone}`} onClick={onClick} aria-label={`${label}: ${value}. View details`}>
    <span className="k-label">{label}</span><span className="k-value">{value}</span><span className="k-foot">{foot}</span>
  </button>;
}

function crmAttention(att: Att[]) {
  if (canSee("crm"))
    openFollowups()
      .filter((a: any) => (a.by === SESSION.user || isAdmin()) && daysFrom(a.due) <= 0)
      .forEach((a: any) => att.push([`${a.type} with ${custBy(a.cust).name}: ${a.subject}${daysFrom(a.due) < 0 ? " (overdue)" : " (today)"}`, daysFrom(a.due) < 0 ? "bad" : "warn", "CRM desk", "crm"]));
  if (canEdit("receivables"))
    arOpen().forEach((x: any) => {
      const p = promiseOf(x.v);
      if (p && p.broken) att.unshift([`${custBy(x.v.cust).name} missed its promise to pay ${inr(p.amt)} on ${x.v.id}`, "bad", "Receivables", "receivables"]);
    });
  if (canEdit("payables")) {
    const r = apOpen().filter((x: any) => x.msme && x.od > -7);
    if (r.length) att.unshift([`${r.length} MSME vendor bill${r.length > 1 ? "s" : ""} near or past the 45-day limit`, "bad", "Payables", "payables"]);
    const d = apOpen().filter((x: any) => x.od > -3);
    if (d.length) att.push([`${d.length} vendor bill${d.length > 1 ? "s" : ""} due within 3 days or overdue: ${inr(d.reduce((s: number, x: any) => s + x.bal, 0))}`, "warn", "Payables", "payables"]);
  }
}

function ProdCard() {
  const act = WOS.filter((w: any) => { const o = ORDERS.find((x: any) => x.id === w.so); return o && !o.dispatched; });
  return (
    <section className="card">
      <div className="card-head"><h2>Production status</h2><button className="btn ghost sm" onClick={() => go("workorders")}>Work orders</button></div>
      <div className="table-wrap">
        <table className="data">
          <tbody>
            {act.map((w: any) => {
              const st = woStages(w);
              const done = w.stage === st.length - 1;
              return (
                <tr key={w.id} className="clickable" tabIndex={0} role="button" aria-label={`View work order ${w.id}`} onClick={() => breakdown(w.id, [
                  { label: fgBy[w.item].name, detail: `${w.qty} units · ${done ? "Ready" : st[w.stage]} · Sales order ${w.so}`, open: () => canSee("orders") ? openModal(<OrderDetail id={w.so} />) : visit("workorders") },
                  { label: "Work order progress", detail: st.join(" → "), open: () => visit("workorders") },
                ])} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}>
                  <td><div className="cell-title mono">{w.id}</div><div className="cell-sub">{fgBy[w.item].name} × {w.qty}</div></td>
                  <td style={{ minWidth: 160 }}>
                    <Stages stages={st} stage={w.stage} style={{ minWidth: 0 }} />
                    <div className="stage-label">{done ? "Ready" : st[w.stage]}</div>
                  </td>
                </tr>
              );
            })}
            {!act.length && <tr><td className="empty">No active work orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DashboardPage() {
  useErp();
  const openLeads = LEADS.filter((l: any) => !["Won", "Lost"].includes(l.stage));
  const pipe = openLeads.reduce((s: number, l: any) => s + leadValue(l), 0);
  const oo = openOrders();
  const ooVal = oo.reduce((s: number, o: any) => s + orderValue(o), 0);
  const wip = WOS.filter((w: any) => w.stage > 0 && w.stage < woStages(w).length - 1).length;
  const shortItems = mrp(oo.map((o: any) => o.id)).filter((x: any) => x.short > 0);
  const amcDue = INSTALLED.filter((i: any) => { const a = amcStatus(i); return !i.pending && (a.c === "warn" || a.c === "bad"); });
  const fam: Record<string, number> = {};
  oo.forEach((o: any) => o.lines.forEach((l: any) => {
    const f = fgBy[l.item].family;
    fam[f] = (fam[f] || 0) + l.qty * l.price * (1 - (o.disc || 0) / 100);
  }));
  const famRows = Object.entries(fam).sort((a, b) => b[1] - a[1]);
  const famMax = Math.max(1, ...famRows.map((r) => r[1]));

  const att: Att[] = [];
  const pend = QUOTES.filter((q: any) => q.status === QS.pend), clar = QUOTES.filter((q: any) => q.status === QS.clar), appr = QUOTES.filter((q: any) => q.status === QS.appr);
  if (isAdmin()) pend.forEach((q: any) => att.push([`${q.id} for ${custBy(q.cust).name} is waiting for your approval (${inrShort(quoteValue(q))}, ${q.disc}% discount)`, q.disc > DISC_LIMIT ? "warn" : "info", "Quotations", "quotes"]));
  else if (canSee("quotes")) {
    clar.forEach((q: any) => att.push([`Admin asked for more details on ${q.id} (${custBy(q.cust).name})`, "warn", "Quotations", "quotes"]));
    appr.forEach((q: any) => att.push([`${q.id} is approved; send it to ${custBy(q.cust).name}`, "info", "Quotations", "quotes"]));
    pend.forEach((q: any) => att.push([`${q.id} for ${custBy(q.cust).name} is with Admin for approval`, "", "Quotations", "quotes"]));
  }
  if (canSee("mrp")) shortItems.slice(0, 3).forEach((x: any) => att.push([`${x.r.name}: short by ${qfmt(x.short)} ${x.r.uom}`, "bad", "Material planning", "mrp"]));
  if (canSee("service")) amcDue.forEach((i: any) => { const a = amcStatus(i); att.push([`${custBy(i.cust).name} · ${fgBy[i.item].name}: ${a.t}`, a.c, "Service", "service"]); });
  if (canSee("leads"))
    LEADS.filter((l: any) => l.follow && daysFrom(l.follow) <= 0 && !["Won", "Lost"].includes(l.stage)).forEach((l: any) =>
      att.push([`Follow up ${custBy(l.cust).name} on ${l.note || fgBy[l.item].name}${daysFrom(l.follow) < 0 ? " (overdue)" : " (today)"}`, daysFrom(l.follow) < 0 ? "bad" : "warn", "Leads", "leads"]));
  crmAttention(att);
  if (canSee("dispatch")) oo.filter((o: any) => orderStatus(o).t === "Ready to dispatch").forEach((o: any) => att.push([`${o.id} for ${custBy(o.cust).name} is ready to dispatch`, "info", "Dispatch", "dispatch"]));
  if (canSee("workorders"))
    WOS.filter((w: any) => { const o = ORDERS.find((x: any) => x.id === w.so); return o && !o.dispatched && w.stage === 0; })
      .forEach((w: any) => att.push([`${w.id} (${fgBy[w.item].name}) is waiting to start`, "", "Work orders", "workorders"]));
  if (canSee("service")) TICKETS.filter((t: any) => t.status !== "Closed").forEach((t: any) => att.push([`${t.id}: ${t.issue}`, "info", "Service", "service"]));
  ([["indent", INDENTS, PEND, "indent"], ["po", POS, PEND, "purchase order"], ["gate", GATES, PEND, "outward gate pass"], ["grn", GRNS, "Pending QC approval", "GRN"], ["mr", MRS, PEND, "material requisition"]] as [string, any[], string, string][]).forEach(
    ([t, list, st, lab]) => {
      const n = list.filter((d) => d.status === st).length;
      if (canApprove(t) && n) att.unshift([`${n} ${lab}${n > 1 ? "s" : ""} waiting for your approval`, "warn", routeName(t)[1], t]);
    },
  );
  if (canEdit("service")) INSTALLED.filter((i: any) => i.pending).forEach((i: any) => att.push([`${fgBy[i.item].name} (${i.serial}) delivered to ${custBy(i.cust).name}: record installation`, "warn", "Service", "service"]));
  if (canEdit("invoices"))
    INVOICES.filter((v: any) => invBal(v) > 0 && daysFrom(v.due) < 0).forEach((v: any) =>
      att.push([`${v.id} for ${custBy(v.cust).name} is overdue: ${inr(invBal(v))} due`, "bad", canSee("receivables") ? "Receivables" : "Invoices", canSee("receivables") ? "receivables" : "invoices"]));
  if (canEdit("orders")) openOrders().filter((o: any) => !o.advance).forEach((o: any) => att.push([`${o.id} (${custBy(o.cust).name}) is waiting for the advance`, "warn", "Sales orders", "orders"]));
  if (canEdit("stores")) { const n = storesInbox().filter((x: any) => x[0] === "warn" || x[0] === "bad").length; if (n) att.unshift([`${n} item${n > 1 ? "s" : ""} waiting at the stores desk`, "warn", "Stores desk", "stores"]); }
  if (canApprove("adj")) { const n = ADJS.filter((a: any) => a.status === PEND).length; if (n) att.unshift([`${n} stock adjustment${n > 1 ? "s" : ""} waiting for your approval`, "warn", "Inventory", "inventory"]); }
  if (canApprove("bills")) { const n = BILLS.filter((b: any) => b.status === PEND).length; if (n) att.unshift([`${n} vendor bill${n > 1 ? "s" : ""} on hold for a 3-way mismatch`, "warn", "Vendor bills", "bills"]); }
  if (canEdit("bills"))
    GRNS.filter((g: any) => ["Accepted", "Partly accepted"].includes(g.status) && g.lines.some((l: any) => l.acc > (l.billed || 0)))
      .forEach((g: any) => att.push([`${g.id} from ${venBy(g.party).name}: accepted material not yet billed`, "info", "Vendor bills", "bills"]));
  if (canEdit("mr")) MRS.filter((m: any) => m.lines.some((l: any) => l.iss - (l.rcv || 0) - (l.rrej || 0) > 0)).forEach((m: any) => att.push([`${m.id}: confirm receipt of issued material`, "info", "Material requisition", "mr"]));
  if (canEdit("po"))
    POS.filter((p: any) => ["Approved", "Partly received"].includes(p.status) && daysFrom(p.due) < 0)
      .forEach((p: any) => att.push([`${p.id} from ${venBy(p.vendor).name} is ${-daysFrom(p.due)} days late`, "bad", "Purchase orders", "po"]));
  if (canEdit("grn")) GATES.filter((g: any) => g.dir === "in" && g.status === "Awaiting GRN").forEach((g: any) => att.push([`${g.id} from ${venBy(g.party).name} is waiting for a GRN`, "info", "GRN", "grn"]));
  if (canEdit("mr")) MRS.filter((m: any) => ["Approved", "Partly approved", "Partly issued"].includes(m.status)).forEach((m: any) => att.push([`${m.id} is approved; issue material`, "info", "Material requisition", "mr"]));
  if (canEdit("gate"))
    GATES.filter((g: any) => g.returnable && ["Out, awaiting return", "Partly returned"].includes(g.status) && g.expBack && daysFrom(g.expBack) <= 3)
      .forEach((g: any) => att.push([`${g.id}: ${g.purpose} with ${venBy(g.party).name} due back ${ds(g.expBack)}`, "", "Gate pass", "gate"]));
  const ops = canSee("workorders") || canSee("mrp");
  const quoteRows = (list: any[]): BreakdownRow[] => list.map((q: any) => ({ label: q.id, detail: `${custBy(q.cust).name} · ${q.status} · ${q.disc}% discount`, value: inrShort(quoteValue(q)), open: () => openModal(<QuoteDetail id={q.id} />) }));
  const amcRows: BreakdownRow[] = amcDue.map((i: any) => ({ label: `${custBy(i.cust).name} · ${fgBy[i.item].name}`, detail: `${i.serial} · ${amcStatus(i).t} · Cover until ${ds(i.amcTo)}`, open: () => visit("service") }));

  return (
    <>
      <PageHead
        route="dashboard"
        title="Dashboard"
        desc={`Welcome, ${me().name} · ${myRole().name} · ${ds(TODAY)}`}
        actions={canEdit("leads") ? [<button key="n" className="btn primary" onClick={openLead}>New lead</button>] : undefined}
      />
      <div className="kpis">
        {canSee("leads") && <DashboardKpi label="Open lead pipeline" value={inrShort(pipe)} foot={`${openLeads.length} leads at list price`} onClick={() => breakdown("Open lead pipeline", openLeads.map((l: any) => ({ label: `${l.id} · ${custBy(l.cust).name}`, detail: `${fgBy[l.item].name} · ${l.stage}${l.follow ? ` · Follow up ${ds(l.follow)}` : ""}`, value: inrShort(leadValue(l)), open: () => visit("leads") })))} />}
        {canSee("orders") && <DashboardKpi label="Open order book" value={inrShort(ooVal)} foot={`${oo.length} sales orders`} onClick={() => breakdown("Open order book", oo.map(orderRow))} />}
        {canSee("quotes") && (
          <DashboardKpi label="Quotes awaiting approval" value={pend.length} foot={`${inrShort(pend.reduce((s: number, q: any) => s + quoteValue(q), 0))} net value`} tone={pend.length ? "warn" : ""} onClick={() => breakdown("Quotes awaiting approval", quoteRows(pend))} />
        )}
        {ops ? (
          <>
            <DashboardKpi label="Work orders in progress" value={wip} foot={`${WOS.filter((w: any) => w.stage === 0).length} waiting to start`} onClick={() => breakdown("Work orders in progress", WOS.filter((w: any) => w.stage > 0 && w.stage < woStages(w).length - 1).map((w: any) => ({ label: `${w.id} · ${fgBy[w.item].name}`, detail: `${w.qty} units · ${woStages(w)[w.stage]} · Sales order ${w.so}`, open: () => canSee("workorders") ? visit("workorders") : canSee("orders") ? openModal(<OrderDetail id={w.so} />) : visit("dashboard") })))} />
            <DashboardKpi label="Raw materials short" value={shortItems.length} foot="for open orders, after stock and POs" tone={shortItems.length ? "alert" : ""} onClick={() => breakdown("Raw materials short", shortItems.map((x: any) => ({ label: x.r.name, detail: `${x.r.code} · Needed ${qfmt(x.qty)} ${x.r.uom} · On hand ${qfmt(x.onHand)} · On order ${qfmt(x.onOrder)}`, value: `${qfmt(x.short)} ${x.r.uom} short`, open: () => visit(canSee("mrp") ? "mrp" : "inventory") })))} />
            <DashboardKpi label="AMC renewals to act on" value={amcDue.length} foot="due within 60 days or expired" tone={amcDue.length ? "warn" : ""} onClick={() => breakdown("AMC renewals to act on", amcRows)} />
          </>
        ) : canSee("quotes") && !isAdmin() ? (
          <>
            <DashboardKpi label="Need your clarification" value={clar.length} foot="quotes returned by Admin" tone={clar.length ? "alert" : ""} onClick={() => breakdown("Need your clarification", quoteRows(clar))} />
            <DashboardKpi label="Approved, ready to send" value={appr.length} foot="send to the customer" onClick={() => breakdown("Approved, ready to send", quoteRows(appr))} />
          </>
        ) : canSee("service") ? (
          <>
            <DashboardKpi label="AMC renewals to act on" value={amcDue.length} foot="due within 60 days or expired" tone={amcDue.length ? "warn" : ""} onClick={() => breakdown("AMC renewals to act on", amcRows)} />
            <DashboardKpi label="Open service tickets" value={TICKETS.filter((t: any) => t.status !== "Closed").length} foot={`${INSTALLED.length} machines in the field`} onClick={() => breakdown("Open service tickets", TICKETS.filter((t: any) => t.status !== "Closed").map((t: any) => ({ label: `${t.id} · ${t.serial}`, detail: `${t.issue} · ${t.status}`, open: () => visit("service") })))} />
          </>
        ) : null}
      </div>
      <div className="grid-2">
        <div className="col-stack">
          {canSee("orders") && <section className="card">
            <div className="card-head"><h2>Open order book by product family</h2><button className="btn ghost sm" onClick={() => breakdown("Open order book", oo.map(orderRow))}>View orders</button></div>
            <div className="card-body">
              <div className="hbar-list">
                {famRows.map(([f, v]) => (
                  <button type="button" className="hbar hbar-action" key={f} onClick={() => breakdown(`${f} · open orders`, oo.filter((o: any) => o.lines.some((l: any) => fgBy[l.item].family === f)).map(orderRow))}>
                    <span className="lbl" title={f}>{f}</span>
                    <div className="track"><div className="fill" style={{ width: `${((v / famMax) * 100).toFixed(1)}%` }} /></div>
                    <span className="val">{inrShort(v)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>}
          {ops && <ProdCard />}
        </div>
        <section className="card">
          <div className="card-head"><h2>Needs attention</h2><span className="small muted">{att.length} items</span></div>
          <div className="table-wrap">
            <table className="data">
              <tbody>
                {att.map((a, i) => (
                  <tr key={i} className="clickable" tabIndex={0} role="button" aria-label={`View ${a[2]}: ${a[0]}`} onClick={() => go(a[3])} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}>
                    <td><Pill t={a[1] === "bad" ? "Action" : a[1] === "warn" ? "Review" : a[1] === "info" ? "Info" : "Waiting"} c={a[1]} /></td>
                    <td>{a[0]}</td>
                    <td className="small muted nowrap hide-sm">{a[2]}</td>
                  </tr>
                ))}
                {!att.length && <tr><td className="empty">Nothing needs attention.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {canSee("orders") && (
        <section className="card">
          <div className="card-head"><h2>Open sales orders</h2><button className="btn ghost sm" onClick={() => go("orders")}>View all</button></div>
          <div className="table-wrap"><OrdersTable list={oo} /></div>
        </section>
      )}
    </>
  );
}
