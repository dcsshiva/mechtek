// Shared building blocks for Selvantra Technologies screens: pills, page header, modals, toasts, history.
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { toast as sonner } from "sonner";
import { Icon } from "./Icon";
import { USERS } from "@/erp/engine";
import { ds } from "@/erp/format";
import { HELP } from "@/erp/help";
import { level, UI } from "@/erp/session";
import { go, routeName } from "@/erp/nav";
import { useErp } from "@/erp/store";
import { ScreenSearch } from "./Search";

export type Tone = "" | "ok" | "warn" | "bad" | "info";

export const Pill = ({ t, c = "" }: { t: ReactNode; c?: string }) => <span className={`pill ${c}`}>{t}</span>;

const DOC_TONE: Record<string, Tone> = {
  "Pending approval": "info", "Pending QC approval": "info", Approved: "ok", Accepted: "ok", Received: "ok", Issued: "ok",
  Returned: "ok", Ordered: "ok", "GRN done": "ok", "Gone out": "ok", "Partly approved": "warn", "Partly accepted": "warn",
  "Partly received": "warn", "Partly issued": "warn", "Partly returned": "warn", "Partly ordered": "warn", "Awaiting GRN": "warn",
  "Needs clarification": "warn", "Out, awaiting return": "warn", Rejected: "bad", "Rejected at gate": "bad", "Short closed": "",
};
export const DocPill = ({ st }: { st: string }) => <Pill t={st} c={DOC_TONE[st] ?? ""} />;

const Q_TONE: Record<string, Tone> = {
  "Pending approval": "info", "Needs clarification": "warn", Approved: "ok", Sent: "ok", Converted: "ok", Rejected: "bad",
};
export const QPill = ({ st }: { st: string }) => <Pill t={st} c={Q_TONE[st] ?? ""} />;

export const SampleNote = ({ children }: { children: ReactNode }) => (
  <div className="sample-note" role="note">
    <b>Sample data</b>
    <span>{children}</span>
  </div>
);

/** Static guide text written in the prototype (contains <b>, <code>). */
export const Html = ({ html, as = "span" }: { html: string; as?: "span" | "div" | "p" }) => {
  const T = as;
  return <T dangerouslySetInnerHTML={{ __html: html }} />;
};

export function PageHead({ route, title, desc, actions }: { route: string; title: string; desc?: ReactNode; actions?: ReactNode }) {
  const [grp] = routeName(route);
  const ro = !["dashboard", "help", "purchase"].includes(route) && level(route) === "view";
  return (
    <>
    <div className="page-head">
      <div>
        <div className="crumb">{grp || "Overview"}</div>
        <h1>
          {title}
          {ro && (
            <span className="readonly-tag">
              <Pill t="View only" />
            </span>
          )}
        </h1>
        {desc && <p className="desc">{desc}</p>}
      </div>
      <div className="actions">
        {HELP[route] && (
          <button className="btn ghost" onClick={() => openModal(<PageHelp route={route} />)} title="How to use this page">
            <Icon name="help" style={{ width: 18, height: 18 }} /> How to use this page
          </button>
        )}
        {/* View-only users never see the primary (create) actions */}
        {!ro && actions}
        {ro && actions && <SecondaryOnly>{actions}</SecondaryOnly>}
      </div>
    </div>
    <ScreenSearch key={route} route={route} />
    </>
  );
}
function SecondaryOnly({ children }: { children: ReactNode }) {
  // Mirrors the prototype: strip primary buttons for read-only users, keep the rest.
  const arr = Array.isArray(children) ? children : [children];
  return <>{arr.filter((c: any) => !(c && c.props && typeof c.props.className === "string" && c.props.className.includes("primary")))}</>;
}

function PageHelp({ route }: { route: string }) {
  const h = HELP[route];
  const name = routeName(route)[1] || "Dashboard";
  return (
    <Modal
      title={`How to use: ${name}`}
      foot={
        <>
          <button className="btn" onClick={() => { closeModal(); go("help"); }}>All guides</button>
          <button className="btn primary" onClick={closeModal}>Got it</button>
        </>
      }
    >
      <Html as="p" html={h[0]} />
      <ol className="steps plain">
        {h[1].map((x: string, i: number) => (
          <li key={i}><Html as="div" html={x} /></li>
        ))}
      </ol>
      {h[2] && <Html as="div" html={`<div class="tip">${h[2]}</div>`} />}
    </Modal>
  );
}

/* ---------------- Modals ---------------- */
let current: ReactNode = null;
const mListeners = new Set<() => void>();
const emit = () => mListeners.forEach((l) => l());
export function openModal(node: ReactNode) {
  current = node;
  emit();
}
export function closeModal() {
  current = null;
  emit();
}
export function ModalHost() {
  const node = useSyncExternalStore(
    (cb) => { mListeners.add(cb); return () => mListeners.delete(cb); },
    () => current,
    () => null,
  );
  useErp(); // re-render modal contents when data changes
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  if (!node) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
      {node}
    </div>
  );
}
export function Modal({ title, children, foot, wide }: { title: ReactNode; children: ReactNode; foot?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = ref.current?.querySelector<HTMLElement>("input:not([type=hidden]),select,textarea,button.primary");
    f?.focus();
  }, []);
  return (
    <div ref={ref} className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button className="close-x" onClick={closeModal} aria-label="Close">×</button>
      </div>
      <div className="modal-body">{children}</div>
      {foot && <div className="modal-foot">{foot}</div>}
    </div>
  );
}

/* ---------------- Toasts ---------------- */
export const toast = (msg: string, bad?: boolean) => (bad ? sonner.error(msg) : sonner(msg));

/* ---------------- Small pieces ---------------- */
export const DL = ({ pairs }: { pairs: ([ReactNode, ReactNode] | null | false | undefined)[] }) => (
  <dl className="detail-grid">
    {pairs.filter(Boolean).map((p, i) => (
      <div key={i}>
        <dt>{(p as any)[0]}</dt>
        <dd>{(p as any)[1]}</dd>
      </div>
    ))}
  </dl>
);

export function History({ items, title = "History" }: { items: any[]; title?: string }) {
  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 12 }}>{title}</h3>
      <div className="hist">
        {items.map((x, i) => (
          <div key={i} className={`hist-item ${x.cls || ""}`}>
            <div className="hist-head">
              <b>{x.act}</b>
              <span className="muted">{USERS[x.by].name} · {USERS[x.by].title}</span>
              <span className="muted small">{ds(x.at)}{x.time ? " · " + x.time : ""}</span>
            </div>
            {x.note && <div className="hist-note">{x.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Stages({ stages, stage, style }: { stages: string[]; stage: number; style?: React.CSSProperties }) {
  const done = stage === stages.length - 1;
  return (
    <div className="stages" aria-hidden="true" style={style}>
      {stages.map((_, i) => (
        <i key={i} className={i < stage || done ? "done" : i === stage ? "cur" : ""} />
      ))}
    </div>
  );
}

/** Segmented filter buttons. */
export function Seg<T extends string | boolean>({ value, options, onChange, label = "View", wrap }: {
  value: T; options: [T, ReactNode][]; onChange: (v: T) => void; label?: string; wrap?: boolean;
}) {
  return (
    <div className="seg" role="group" aria-label={label} style={wrap ? { flexWrap: "wrap" } : undefined}>
      {options.map(([v, t]) => (
        <button key={String(v)} aria-pressed={value === v} onClick={() => onChange(v)}>{t}</button>
      ))}
    </div>
  );
}

/** Field with label and inline error. */
export function Field({ id, label, err, children, span }: { id?: string; label: ReactNode; err?: string; children: ReactNode; span?: boolean }) {
  return (
    <div className="field" style={span ? { gridColumn: "1/-1" } : undefined}>
      <label htmlFor={id}>{label}</label>
      {children}
      {err ? <span className="field-err">{err}</span> : null}
    </div>
  );
}

export const ErrLine = ({ msg }: { msg?: string }) =>
  msg ? <p className="small" role="alert" style={{ color: "var(--bad)" }}>{msg}</p> : null;

export { UI };
