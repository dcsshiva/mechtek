// Lists & settings: the drop-down lists (units, lead sources, departments, states, BOM groups, ...)
// and the company profile, stored in their own database tables and editable here.
import { useState } from "react";
import { LIST_DATA, VENDORS, rebuildLists } from "@/erp/engine";
import { LISTS, type Col, type ListSpec } from "@/erp/schema";
import { UI, canEdit, modName, setUI } from "@/erp/session";
import { bump, useErp } from "@/erp/store";
import { Field, Modal, PageHead, Seg, closeModal, openModal, toast } from "../ui";

const GROUPS = [...new Set(LISTS.map((l) => l.group))];
/** Lists whose entries are just a name (the code is the name). */
const NAME_ONLY = new Set([
  "uoms",
  "lead_sources",
  "lead_stages",
  "activity_types",
  "contact_roles",
  "departments",
  "designations",
  "product_families",
]);
const nameOnly = (l: ListSpec) => NAME_ONLY.has(l.coll);
/** Lists whose name is copied into records: renaming does not change records that already use it. */
const COPIED = new Set([...NAME_ONLY, "bom_groups", "states"]);
/** Lists with a fixed set of rows: their entries drive the workflow, so only labels can change. */
const FIXED = new Set(["item_kinds", "company"]);
const editable = (l: ListSpec) => l.modules.some((m) => canEdit(m));
const shown = (l: ListSpec) =>
  l.cols.filter(
    (c) =>
      !(
        c.column === "code" &&
        (nameOnly(l) || l.coll === "material_categories" || l.coll === "company")
      ),
  );
const fmt = (c: Col, v: any) =>
  c.column === "vendor_id"
    ? (VENDORS.find((x: any) => x.id === v)?.name ?? (v || "—"))
    : v == null || v === ""
      ? "—"
      : String(v);

export function ListsPage() {
  useErp();
  const group = GROUPS.includes(UI.listGroup) ? UI.listGroup : GROUPS[0];
  return (
    <>
      <PageHead
        route="lists"
        title="Lists & settings"
        desc="The choices offered in drop-downs across the ERP, and the company details printed on documents. Each list is its own table in the database."
      />
      <Seg
        label="List group"
        value={group}
        onChange={(v) => setUI({ listGroup: v })}
        options={GROUPS.map((g) => [g, g] as [string, string])}
      />
      <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
        {LISTS.filter((l) => l.group === group).map((l) => (
          <ListCard key={l.coll} l={l} />
        ))}
      </div>
    </>
  );
}

function ListCard({ l }: { l: ListSpec }) {
  const rows = LIST_DATA[l.coll] || [];
  const can = editable(l);
  const cols = shown(l);
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{l.label}</h2>
          <div className="small muted">
            {l.doc}{" "}
            {!can && (
              <>Changed by roles with full access to {l.modules.map(modName).join(" or ")}.</>
            )}
          </div>
        </div>
        {can && !FIXED.has(l.coll) && (
          <button className="btn sm" onClick={() => openModal(<EntryModal l={l} />)}>
            Add
          </button>
        )}
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.column} className={c.type === "n" ? "num" : ""}>
                  {c.label}
                </th>
              ))}
              <th className="small muted">Table: {l.table}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.code}>
                {cols.map((c) => (
                  <td
                    key={c.column}
                    className={
                      c.type === "n"
                        ? "num"
                        : c.column === "code" || c.column === "gst_code" || c.column === "gstin"
                          ? "mono"
                          : ""
                    }
                  >
                    {fmt(c, r[c.field])}
                  </td>
                ))}
                <td className="nowrap">
                  {can && (
                    <button
                      className="btn sm ghost"
                      onClick={() => openModal(<EntryModal l={l} code={r.code} />)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={cols.length + 1} className="empty">
                  No entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EntryModal({ l, code }: { l: ListSpec; code?: string }) {
  const rows: any[] = LIST_DATA[l.coll];
  const rec = code != null ? rows.find((r) => r.code === code) : null;
  const autoCode = l.coll === "material_categories";
  const fields = l.cols.filter(
    (c) => c.column !== "code" || (!nameOnly(l) && !autoCode && l.coll !== "company"),
  );
  const [v, setV] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((c) => [c.field, rec && rec[c.field] != null ? String(rec[c.field]) : ""]),
    ),
  );
  const [e, setE] = useState<Record<string, string>>({});
  const set = (k: string) => (x: any) => setV({ ...v, [k]: x.target.value });
  const save = () => {
    if (!editable(l)) return toast(`Your role cannot change ${l.label.toLowerCase()}.`, true);
    const errs: Record<string, string> = {};
    const out: any = {};
    for (const c of fields) {
      const s = (v[c.field] || "").trim();
      if (c.type === "n") {
        if (s === "") {
          out[c.field] = undefined;
          continue;
        }
        const n = Number(s);
        if (!isFinite(n) || n < 0) errs[c.field] = "Enter a number (0 or more).";
        else out[c.field] = n;
      } else out[c.field] = s || undefined;
    }
    const name = out.name as string | undefined;
    if (!name) errs.name = "Enter a name.";
    else if (rows.some((r) => r !== rec && String(r.name).toLowerCase() === name.toLowerCase()))
      errs.name = "This name is already in the list.";
    let newCode = rec?.code;
    if (!rec) {
      newCode = autoCode
        ? String(Math.max(-1, ...rows.map((r) => +r.code)) + 1)
        : nameOnly(l)
          ? name
          : out.code;
      if (!newCode) errs.code = "Enter a code.";
      else if (rows.some((r) => String(r.code).toLowerCase() === String(newCode).toLowerCase()))
        errs[nameOnly(l) ? "name" : "code"] = "This code is already in the list.";
    }
    setE(errs);
    if (Object.keys(errs).length) return;
    if (rec) {
      for (const c of fields)
        if (c.column !== "code") {
          if (out[c.field] === undefined) delete rec[c.field];
          else rec[c.field] = out[c.field];
        }
    } else {
      const n: any = { code: newCode };
      for (const c of fields)
        if (c.column !== "code" && out[c.field] !== undefined) n[c.field] = out[c.field];
      rows.push(n);
    }
    rebuildLists();
    closeModal();
    bump();
    toast(rec ? `${l.label}: ${name} saved` : `${l.label}: ${name} added`);
  };
  return (
    <Modal
      title={rec ? `Edit · ${l.label}` : `Add to ${l.label.toLowerCase()}`}
      foot={
        <>
          <button className="btn" onClick={closeModal}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            {rec ? "Save" : "Add"}
          </button>
        </>
      }
    >
      {rec && COPIED.has(l.coll) && (
        <p className="small muted">
          Records that already use “{rec.name}” keep it as it was; the new name is offered from now
          on.
        </p>
      )}
      {rec && !COPIED.has(l.coll) && (
        <p className="small muted">The change shows everywhere this entry is used.</p>
      )}
      <div className="form-grid">
        {fields.map((c) => (
          <Field
            key={c.field}
            id={"ls-" + c.column}
            label={c.label + (c.column === "name" || c.column === "code" ? " *" : "")}
            err={e[c.field]}
          >
            {c.column === "vendor_id" ? (
              <select
                className="input"
                id={"ls-" + c.column}
                value={v[c.field]}
                onChange={set(c.field)}
              >
                <option value="">None</option>
                {VENDORS.map((x: any) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={`input ${c.type === "n" ? "num" : ""} ${c.column === "code" ? "mono" : ""} ${e[c.field] ? "invalid" : ""}`}
                id={"ls-" + c.column}
                type={c.type === "n" ? "number" : "text"}
                disabled={!!rec && c.column === "code"}
                min={c.type === "n" ? 0 : undefined}
                value={v[c.field]}
                onChange={set(c.field)}
              />
            )}
          </Field>
        ))}
      </div>
    </Modal>
  );
}
