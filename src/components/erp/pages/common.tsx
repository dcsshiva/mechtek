import type React from "react";
// Pieces shared by several screens (orders table, item summaries, pickers, credit check).
import { Fragment } from "react";
import {
  CUST, FG, custBy, fgBy, isKid, orderStatus, orderValue, arOpen,
} from "@/erp/engine";
import { daysFrom, ds, inr, inrShort } from "@/erp/format";
import { Pill, openModal } from "../ui";
import { OrderDetail } from "./Orders";

export function ItemsSummary({ lines, sep = "br" }: { lines: any[]; sep?: "br" | "comma" }) {
  const parts = lines
    .map((l: any, i: number) => {
      if (isKid(l)) return null;
      const n = lines.filter((k: any) => k.pi === i).length;
      return (
        <Fragment key={i}>
          {l.qty} × {fgBy[l.item].name}
          {n ? <span className="small muted"> + {n} item{n > 1 ? "s" : ""}</span> : null}
        </Fragment>
      );
    })
    .filter(Boolean) as React.ReactElement[];
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && (sep === "br" ? <br /> : ", ")}
          {p}
        </Fragment>
      ))}
    </>
  );
}

export function OrdersTable({ list }: { list: any[] }) {
  return (
    <table className="data">
      <thead>
        <tr>
          <th>Order</th><th>Customer</th><th>Items</th><th className="num">Value</th><th>Delivery</th><th>Advance</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
        {list.map((o: any) => {
          const st = orderStatus(o);
          const d = daysFrom(o.due);
          const c = custBy(o.cust);
          return (
            <tr key={o.id} className="clickable" onClick={() => openModal(<OrderDetail id={o.id} />)}>
              <td><div className="cell-title mono">{o.id}</div><div className="cell-sub">{ds(o.date)}</div></td>
              <td><div className="cell-title">{c.name}</div><div className="cell-sub">{c.city}, {c.country}</div></td>
              <td>
                {o.lines.filter((l: any) => !isKid(l)).map((l: any, i: number) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {l.qty} × {fgBy[l.item].name}
                    {(l.disp || 0) > 0 && l.disp < l.qty ? <span className="small muted"> ({l.disp} sent)</span> : null}
                  </Fragment>
                ))}
                <div className="cell-sub">PO {o.custPO || "—"}</div>
              </td>
              <td className="num">{inr(orderValue(o))}</td>
              <td className="nowrap">
                {o.dispatched ? ds(o.dispatchDate) : ds(o.due)}
                {!o.dispatched && <div className="cell-sub">{d < 0 ? `${-d} days late` : `in ${d} days`}</div>}
              </td>
              <td className="nowrap">
                {o.advance ? (
                  <>
                    <Pill t="Received" c="ok" />
                    <div className="cell-sub">{inr(o.advanceAmt || 0)}</div>
                  </>
                ) : (
                  <Pill t="Pending" c="warn" />
                )}
              </td>
              <td><Pill t={st.t} c={st.c} /></td>
            </tr>
          );
        })}
        {!list.length && (
          <tr><td colSpan={7} className="empty">No orders.</td></tr>
        )}
      </tbody>
    </table>
  );
}

export const CustOptions = () => (
  <>
    {CUST.map((c: any) => (
      <option key={c.id} value={c.id}>{c.name} · {c.city}</option>
    ))}
  </>
);
export const FgOptions = () => (
  <>
    {FG.map((f: any) => (
      <option key={f.code} value={f.code}>{f.name}</option>
    ))}
  </>
);

export function CreditBanner({ cid }: { cid: string }) {
  const c = custBy(cid);
  const o = arOpen().filter((x: any) => x.v.cust === cid);
  const od = o.filter((x: any) => x.od > 0);
  const rec = o.reduce((s: number, x: any) => s + x.bal, 0);
  const msg: string[] = [];
  if (od.length)
    msg.push(
      `${inr(od.reduce((s: number, x: any) => s + x.bal, 0))} overdue on ${od.length} invoice${od.length > 1 ? "s" : ""} (oldest ${Math.max(...od.map((x: any) => x.od))} days)`,
    );
  if (c.creditLimit && rec > c.creditLimit) msg.push(`receivable ${inrShort(rec)} is above the ${inrShort(c.creditLimit)} credit limit`);
  if (!msg.length) return null;
  return (
    <div className="banner warn" style={{ display: "block" }}>
      <b>Credit check:</b> {c.name} has {msg.join("; ")}. Confirm with accounts before committing delivery.
    </div>
  );
}
