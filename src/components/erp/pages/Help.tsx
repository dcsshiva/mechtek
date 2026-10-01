// Help & guides: step-by-step process guides with jumps to the screens they describe.
import { useEffect } from "react";
import { GUIDES } from "@/erp/guides";
import { UI, canEdit, canSee } from "@/erp/session";
import { useErp } from "@/erp/store";
import { go } from "@/erp/nav";
import { PageHead } from "../ui";

const TOC: [string, string][] = [
  ["help-bom", "How to create a BOM"], ["help-proc", "Procurement and stores cycle"], ["help-o2c", "Order to invoice"], ["help-stores", "Stores in-charge"],
  ["help-uom", "Units: pieces and kg"], ["help-combo", "Combo sets"], ["help-fin", "CRM, receivables, payables"], ["help-appr", "Approvals: full, part or reject"],
];

const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ block: "start" });

export function HelpPage() {
  useErp();
  useEffect(() => {
    if (UI.helpAnchor) {
      const id = UI.helpAnchor;
      UI.helpAnchor = null;
      requestAnimationFrame(() => jump(id));
    }
  }, []);
  return (
    <>
      <PageHead route="help" title="Help & guides" desc="Step-by-step guides for creating a bill of materials and running the procurement and stores cycle in Selvantra Technologies." />
      <div className="help-wrap">
        <nav className="help-toc card" style={{ padding: 8 }} aria-label="Guides">
          {TOC.map(([id, t]) => <a key={id} href={"#" + id} onClick={(e) => { e.preventDefault(); jump(id); }}>{t}</a>)}
        </nav>
        <div className="help-body">
          {GUIDES.map((g) => {
            const show = g.btn && (g.btn.perm === "canSee" ? canSee(g.btn.mod) : canEdit(g.btn.mod));
            return (
              <section key={g.id} className="card" id={g.id}>
                <div className="card-head">
                  <h2>{g.title}</h2>
                  {show && g.btn && <button className="btn sm" onClick={() => go(g.btn!.route)}>{g.btn.label}</button>}
                </div>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: g.gap }} dangerouslySetInnerHTML={{ __html: g.html }} />
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
