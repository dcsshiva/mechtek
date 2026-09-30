import { useState } from "react";
import { CUST, INSTALLED, INVOICES, STATES, GSTIN_RE, custBy, invBal, openOrders, stateCode, supplyType } from "@/erp/engine";
import { inr } from "@/erp/format";
import { canEdit, denyReason } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { Field, Modal, PageHead, Pill, SampleNote, closeModal, openModal, toast } from "../ui";
import { Cust360 } from "./Crm";

export function CustomersPage() {
  useErp();
  return (
    <>
      <PageHead
        route="customers"
        title="Customers"
        desc="Domestic and export customers with GST details and installed machines."
        actions={[<button key="a" className="btn primary" onClick={() => openCust()}>Add customer</button>]}
      />
      <SampleNote>Customer names and GSTINs are fictional, for demonstration only.</SampleNote>
      <section className="card">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Code</th><th>Customer</th><th>Location</th><th>GST</th><th className="num">Machines</th><th className="num">Open orders</th><th className="num">Receivable</th><th></th></tr></thead>
            <tbody>
              {CUST.map((c: any) => {
                const rec = INVOICES.filter((v: any) => v.cust === c.id).reduce((s: number, v: any) => s + invBal(v), 0);
                const miss = c.country === "India" && !(c.gstin && c.state);
                return (
                  <tr key={c.id}>
                    <td className="mono">{c.id}</td>
                    <td className="cell-title">{c.name}<div className="cell-sub" style={{ fontWeight: 400 }}>{c.contact}</div></td>
                    <td>{c.city}, {c.country}{c.state && <div className="cell-sub">{c.state} ({stateCode(c.state)})</div>}</td>
                    <td>
                      {c.country !== "India" ? <Pill t="Export (LUT)" c="info" /> : miss ? <Pill t="GSTIN missing" c="bad" /> : (
                        <>
                          <span className="mono small">{c.gstin}</span>
                          <div className="cell-sub">{supplyType(c) === "intra" ? "CGST + SGST" : "IGST"}</div>
                        </>
                      )}
                    </td>
                    <td className="num">{INSTALLED.filter((i: any) => i.cust === c.id).length}</td>
                    <td className="num">{openOrders().filter((o: any) => o.cust === c.id).length}</td>
                    <td className="num">{rec ? inr(rec) : "—"}</td>
                    <td className="nowrap">
                      <button className="btn sm" onClick={() => openModal(<Cust360 cid={c.id} />)}>Overview</button>{" "}
                      {canEdit("customers") && <button className="btn sm" onClick={() => openCust(c.id)}>Edit</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function openCust(id?: string) {
  const deny = denyReason("customers");
  if (deny) return toast(deny, true);
  openModal(<CustModal id={id} />);
}

export function CustModal({ id }: { id?: string }) {
  const c = id ? custBy(id) : null;
  const [f, setF] = useState({
    name: c?.name || "", addr: c?.addr || "", city: c?.city || "", country: c ? c.country || "" : "India",
    state: c?.state || "", gstin: c?.gstin || "", contact: c?.contact || "",
  });
  const [e, setE] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (x: any) => setF({ ...f, [k]: x.target.value });
  const save = () => {
    const name = f.name.trim(), city = f.city.trim(), state = f.state, country = f.country.trim() || "India", gstin = f.gstin.trim().toUpperCase();
    const errs: Record<string, string> = {};
    if (!name) errs.name = "Enter the customer name.";
    if (!city) errs.city = "Enter the city.";
    if (country === "India") {
      if (!state) errs.state = "Choose the state.";
      if (gstin) {
        if (!GSTIN_RE.test(gstin)) errs.gstin = "This is not a valid GSTIN format.";
        else if (gstin.slice(0, 2) !== stateCode(state)) errs.gstin = `GSTIN starts with ${gstin.slice(0, 2)} but ${state || "the state"} is ${stateCode(state) || "not set"}.`;
      }
    }
    setE(errs);
    if (Object.keys(errs).length) return;
    const data = { name, city, country, state: country === "India" ? state : "", gstin: country === "India" ? gstin : "", addr: f.addr.trim(), contact: f.contact.trim() || "—" };
    if (c) Object.assign(c, data);
    else CUST.push({ id: "C" + String(CUST.length + 1).padStart(3, "0"), ...data });
    closeModal();
    bump();
    toast(c ? `${name} updated` : `${name} added`);
  };
  const cls = (k: string) => `input ${e[k] ? "invalid" : ""}`;
  return (
    <Modal
      wide
      title={c ? `Edit customer · ${c.name}` : "Add customer"}
      foot={<><button className="btn" onClick={closeModal}>Cancel</button><button className="btn primary" onClick={save}>{c ? "Save customer" : "Add customer"}</button></>}
    >
      <div className="form-grid">
        <Field id="cu-name" label="Customer name *" err={e.name} span><input className={cls("name")} id="cu-name" value={f.name} onChange={set("name")} /></Field>
        <Field id="cu-addr" label="Address" span><input className="input" id="cu-addr" value={f.addr} onChange={set("addr")} /></Field>
        <Field id="cu-city" label="City *" err={e.city}><input className={cls("city")} id="cu-city" value={f.city} onChange={set("city")} /></Field>
        <Field id="cu-country" label="Country"><input className="input" id="cu-country" value={f.country} onChange={set("country")} /></Field>
        <Field id="cu-state" label="State (India)" err={e.state}>
          <select className={cls("state")} id="cu-state" value={f.state} onChange={set("state")}>
            <option value="">Outside India</option>
            {STATES.map((s: any) => <option key={s[0]} value={s[0]}>{s[0]} ({s[1]})</option>)}
          </select>
        </Field>
        <Field id="cu-gstin" label="GSTIN" err={e.gstin}>
          <input className={`${cls("gstin")} mono`} id="cu-gstin" value={f.gstin} onChange={set("gstin")} placeholder="15 characters, e.g. 29ABCDE1234F1Z5" autoCapitalize="characters" />
        </Field>
        <Field id="cu-contact" label="Contact person"><input className="input" id="cu-contact" value={f.contact} onChange={set("contact")} /></Field>
      </div>
      <p className="small muted">Indian customers need a state and GSTIN before a tax invoice can be raised. The first two digits of the GSTIN must match the state code.</p>
    </Modal>
  );
}
