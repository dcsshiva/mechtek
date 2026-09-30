// Demand forecast: history vs six methods, pipeline-adjusted plan, and the raw material the plan needs.
import { useEffect, useRef, useState } from "react";
import { fgBy } from "@/erp/engine";
import { inr, inrShort, qfmt } from "@/erp/format";
import { FC_HIST_N, FC_ITEMS, FC_METHODS, fcCompute, fcFmt, fcGroup, fcMaterial, fcMonths, fcProductRows } from "@/erp/forecast";
import { UI, canEdit, canSee, myRole, setUI } from "@/erp/session";
import { useErp } from "@/erp/store";
import { go } from "@/erp/nav";
import { PageHead, Pill, Seg, toast } from "../ui";
import { openIndent } from "./Purchase";

if (UI.fcSel == null) Object.assign(UI, { fcSel: "all-units", fcMethod: "auto", fcH: 6, fcPlan: {} });

function Spark({ y, w = 84, hh = 24 }: { y: number[]; w?: number; hh?: number }) {
  const mx = Math.max(1, ...y);
  const p = y.map((v, i) => [(i / (y.length - 1)) * (w - 4) + 2, hh - 2 - (v / mx) * (hh - 6)]);
  const last = p[p.length - 1];
  return (
    <svg width={w} height={hh} aria-hidden="true" className="fc-spark">
      <polyline points={p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ")} />
      <circle cx={last[0]} cy={last[1]} r={2.5} />
    </svg>
  );
}

function FcChart({ d }: { d: any }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const upd = () => setW(Math.max(300, el.clientWidth));
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const Hh = W < 560 ? 240 : 300;
  const m = { l: W < 560 ? 44 : 60, r: W < 560 ? 56 : 92, t: 16, b: 30 };
  const n = FC_HIST_N, h = d.chosen.fc.length, N = n + h, iw = W - m.l - m.r, ih = Hh - m.t - m.b;
  const X = (i: number) => m.l + iw * (i / (N - 1));
  const vmax = Math.max(...d.y, ...d.adj, ...d.chosen.fc.map((v: number, k: number) => v + d.band[k])) * 1.08 || 1;
  const step = (() => { const raw = vmax / 4, p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; })();
  const top = Math.ceil(vmax / step) * step;
  const Y = (v: number) => m.t + ih * (1 - v / top);
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  const pts = (a: [number, number][]) => a.map(([i, v]) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const act: [number, number][] = d.y.map((v: number, i: number) => [i, v]);
  const fc: [number, number][] = [[n - 1, d.y[n - 1]], ...d.chosen.fc.map((v: number, k: number) => [n + k, v] as [number, number])];
  const adj: [number, number][] = [[n - 1, d.y[n - 1]], ...d.adj.map((v: number, k: number) => [n + k, v] as [number, number])];
  const bandUp: [number, number][] = d.chosen.fc.map((v: number, k: number) => [n + k, v + d.band[k]]);
  const bandLo: [number, number][] = d.chosen.fc.map((v: number, k: number) => [n + k, Math.max(0, v - d.band[k])]).reverse();
  const every = W < 560 ? 3 : 1;
  const lastF = d.chosen.fc[h - 1], lastA = d.adj[h - 1];
  const showAdj = d.lift > 0.0001;
  let ly1 = Y(lastF), ly2 = Y(lastA);
  if (showAdj && Math.abs(ly1 - ly2) < 14) { const mid = (ly1 + ly2) / 2; ly1 = mid + (lastF <= lastA ? 7 : -7); ly2 = mid + (lastF <= lastA ? -7 : 7); }
  const onMove = (clientX: number, rect: DOMRect) => setHover(Math.max(0, Math.min(N - 1, Math.round(((clientX - rect.left - m.l) / iw) * (N - 1)))));
  let tip = null;
  if (hover != null) {
    const i = hover, mo = fcMonths[i], k = i - n;
    const tx = X(i) + 12, tw = 220;
    tip = (
      <div className="fc-tip" style={{ left: tx + tw > W ? X(i) - tw - 12 : tx, top: m.t + 8 }}>
        <b>{mo.label.replace(" ", " 20")}{mo.cur ? " (current)" : ""}</b>
        {i < n ? (
          <div><span className="fc-key a" />Actual <b>{fcFmt(d.y[i], d.unit)}</b></div>
        ) : (
          <>
            <div><span className="fc-key a dash" />Forecast <b>{fcFmt(d.chosen.fc[k], d.unit)}</b></div>
            <div className="muted">80% range {fcFmt(Math.max(0, d.chosen.fc[k] - d.band[k]), d.unit)} to {fcFmt(d.chosen.fc[k] + d.band[k], d.unit)}</div>
            {showAdj && <div><span className="fc-key b dash" />Pipeline-adjusted <b>{fcFmt(d.adj[k], d.unit)}</b></div>}
          </>
        )}
      </div>
    );
  }
  return (
    <div ref={box} className="fc-chart">
      <svg width={W} height={Hh} role="img" aria-label={`${d.label}: 12 months of actuals and ${h}-month forecast`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} className="fc-grid" />
            <text x={m.l - 8} y={Y(v) + 4} textAnchor="end" className="fc-tick">{fcFmt(v, d.unit)}</text>
          </g>
        ))}
        <rect x={X(n - 0.5)} y={m.t} width={X(N - 1) - X(n - 0.5) + 8} height={ih} className="fc-future" />
        <text x={X(n - 0.5) + 6} y={m.t + 12} className="fc-tick">Forecast</text>
        {fcMonths.slice(0, N).map((mo, i) =>
          i % every === 0 || i === n ? (
            <text key={i} x={X(i)} y={Hh - 10} textAnchor="middle" className="fc-tick">
              {mo.label.split(" ")[0]}{mo.m === 0 || i === 0 ? ` ’${mo.label.split(" ")[1]}` : ""}
            </text>
          ) : null,
        )}
        <polygon points={pts([...bandUp, ...bandLo])} className="fc-band" />
        {showAdj && <polyline points={pts(adj)} className="fc-line fc-b dashed" />}
        <polyline points={pts(fc)} className="fc-line fc-a dashed" />
        <polyline points={pts(act)} className="fc-line fc-a" />
        {act.map(([i, v]) => <circle key={i} cx={X(i)} cy={Y(v)} r={4} className="fc-dot" />)}
        <text x={X(N - 1) + 8} y={ly1 + 4} className="fc-end">{fcFmt(lastF, d.unit)}</text>
        {showAdj && <text x={X(N - 1) + 8} y={ly2 + 4} className="fc-end">{fcFmt(lastA, d.unit)}</text>}
        {hover != null && <line x1={X(hover)} x2={X(hover)} y1={m.t} y2={m.t + ih} className="fc-cross" />}
        <rect x={m.l} y={m.t} width={iw} height={ih} fill="transparent"
          onMouseMove={(e) => onMove(e.clientX, (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect())}
          onTouchStart={(e) => onMove(e.touches[0].clientX, (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect())}
          onMouseLeave={() => setHover(null)} />
      </svg>
      {tip}
    </div>
  );
}

export function ForecastPage() {
  useErp();
  const d: any = fcCompute(UI.fcSel, UI.fcMethod, UI.fcH);
  const ed = canEdit("forecast");
  const tot = d.y.reduce((a: number, v: number) => a + v, 0), h1 = d.y.slice(0, 6).reduce((a: number, v: number) => a + v, 0), h2 = d.y.slice(6).reduce((a: number, v: number) => a + v, 0);
  const gr = h1 ? (h2 - h1) / h1 : 0;
  const next3 = d.chosen.fc.slice(0, 3).reduce((a: number, v: number) => a + v, 0), last3 = d.y.slice(-3).reduce((a: number, v: number) => a + v, 0);
  const opts: [string, string][] = [["all-units", "All machines · units"], ["cp-units", "All change parts · sets"], ["all-rev", "All products · revenue"]];
  const rows = fcProductRows(UI.fcPlan);
  const mat = fcMaterial(rows);
  const matShort = mat.filter((x: any) => x.short > 0);
  const planTot = rows.reduce((s: number, r: any) => s + r.plan * r.f.price, 0);
  const span = `${fcMonths[0].label.replace(" ", " 20")} to ${fcMonths[FC_HIST_N - 1].label.replace(" ", " 20")}`;
  const raise = () => {
    if (!canEdit("indent")) return toast(`${myRole().name} cannot raise indents.`, true);
    const sh = fcMaterial(fcProductRows(UI.fcPlan)).filter((x: any) => x.short > 0);
    openIndent({ source: "Demand forecast", dept: "Stores & purchase", reason: `Advance buying for the next 3 months' forecast (${sh.length} materials)`, lines: sh.map((x: any) => ({ rm: x.r.code, qty: Math.ceil(x.short) })) });
  };
  const setPlan = (code: string, val: string) => {
    if (!canEdit("forecast")) return;
    const v = Math.max(0, Math.round(+val || 0));
    setUI({ fcPlan: { ...UI.fcPlan, [code]: v } });
  };
  return (
    <>
      <PageHead route="forecast" title="Demand forecast" desc="Twelve months of sales history projected forward with six forecasting methods, checked against booked orders and the CRM pipeline, and turned into a raw-material requirement."
        actions={ed && canEdit("indent") && matShort.length ? [<button key="i" className="btn primary" onClick={raise}>Raise indent for {matShort.length} forecast shortage{matShort.length > 1 ? "s" : ""}</button>] : undefined} />
      <div className="toolbar fc-ctrl">
        <label className="small muted" htmlFor="fc-sel">Forecast</label>
        <select className="input" id="fc-sel" value={UI.fcSel} onChange={(e) => setUI({ fcSel: e.target.value })} style={{ width: "auto", minWidth: 0, maxWidth: 300 }}>
          <optgroup label="Totals">{opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</optgroup>
          {["Machines", "Change parts", "Spares and services"].map((g) => (
            <optgroup key={g} label={g}>
              {FC_ITEMS.filter(([c]: any) => fcGroup(c) === g).flatMap(([c]: any) => [
                <option key={c + "u"} value={c + "|u"}>{fgBy[c].name} · units</option>,
                <option key={c + "r"} value={c + "|rev"}>{fgBy[c].name} · revenue</option>,
              ])}
            </optgroup>
          ))}
        </select>
        <label className="small muted" htmlFor="fc-m">Method</label>
        <select className="input" id="fc-m" value={UI.fcMethod} onChange={(e) => setUI({ fcMethod: e.target.value })} style={{ width: "auto", minWidth: 0, maxWidth: 360 }}>
          <option value="auto">Auto: most accurate ({d.best.m.name})</option>
          {FC_METHODS.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <Seg label="Horizon" value={UI.fcH} onChange={(v) => setUI({ fcH: v })} options={[[3, "3 months"], [6, "6 months"]] as any} />
      </div>
      <div className="kpis">
        <div className="kpi"><span className="k-label">Last 12 months</span><span className="k-value">{fcFmt(tot, d.unit)}{d.unit !== "₹" && <> <span className="small muted">{d.unit}</span></>}</span><span className="k-foot">{gr >= 0 ? "+" : ""}{Math.round(gr * 100)}% second half vs first half</span></div>
        <div className="kpi"><span className="k-label">Next 3 months, forecast</span><span className="k-value">{fcFmt(next3, d.unit)}</span><span className="k-foot">vs {fcFmt(last3, d.unit)} in the last 3 months</span></div>
        <div className="kpi"><span className="k-label">Forecast accuracy</span><span className="k-value">{d.chosen.acc == null ? "Low volume" : Math.round(d.chosen.acc * 100) + "%"}</span><span className="k-foot">{d.chosen.m.name}, {d.chosen.acc == null ? "too few recent sales to score; picked by smallest error" : "tested on the last 4 months"}</span></div>
        <div className="kpi"><span className="k-label">Booked + weighted pipeline</span><span className="k-value">{fcFmt(d.known, d.unit)}</span><span className="k-foot">{d.lift > 0 ? "above the statistical forecast: plan uses the higher figure" : "covered by the statistical forecast"}</span></div>
      </div>
      <section className="card">
        <div className="card-head">
          <div><h2>{d.label}</h2><div className="small muted">Monthly actuals, {span} (sample data), and the {UI.fcH}-month forecast. Hover for values.</div></div>
          <div className="fc-legend small">
            <span><span className="fc-key a" />Actual</span>
            <span><span className="fc-key a dash" />Forecast: {d.chosen.m.name}</span>
            <span><span className="fc-swatch" />80% range</span>
            {d.lift > 0 && <span><span className="fc-key b dash" />Pipeline-adjusted</span>}
          </div>
        </div>
        <div className="card-body">
          <FcChart d={d} />
          <details className="fc-data">
            <summary className="small">Show as a table</summary>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Month</th><th className="num">Actual</th><th className="num">Forecast</th><th className="num">80% range</th><th className="num">Pipeline-adjusted</th></tr></thead>
                <tbody>
                  {fcMonths.slice(0, FC_HIST_N + UI.fcH).map((mo, i) => {
                    const k = i - FC_HIST_N;
                    return (
                      <tr key={i}>
                        <td>{mo.label.replace(" ", " 20")}</td>
                        <td className="num">{i < FC_HIST_N ? fcFmt(d.y[i], d.unit) : "—"}</td>
                        <td className="num">{k >= 0 ? fcFmt(d.chosen.fc[k], d.unit) : "—"}</td>
                        <td className="num">{k >= 0 ? fcFmt(Math.max(0, d.chosen.fc[k] - d.band[k]), d.unit) + " – " + fcFmt(d.chosen.fc[k] + d.band[k], d.unit) : "—"}</td>
                        <td className="num">{k >= 0 ? fcFmt(d.adj[k], d.unit) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h2>Methods compared</h2><span className="small muted">Each method forecasts each of the last 4 months from the months before it. Accuracy = 100% − weighted absolute error.</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Method</th><th>How it works</th><th className="num">Accuracy</th><th className="num">Bias</th><th className="num">Next 3 months</th><th></th></tr></thead>
            <tbody>
              {d.ev.slice().sort((a: any, b: any) => a.score - b.score).map((e: any) => (
                <tr key={e.m.id} className={e === d.chosen ? "fc-chosen" : ""}>
                  <td className="cell-title nowrap">{e.m.name}{e === d.best && <> <Pill t="Most accurate" c="ok" /></>}</td>
                  <td className="small" style={{ minWidth: 220 }}>{e.m.desc}</td>
                  <td className="num">{e.acc == null ? "±" + fcFmt(e.mae, "u") + " / mo" : Math.round(e.acc * 100) + "%"}</td>
                  <td className="num">{e.low ? "—" : (e.bias >= 0 ? "+" : "") + Math.round(e.bias * 100) + "%"}</td>
                  <td className="num">{fcFmt(e.fc.slice(0, 3).reduce((a: number, v: number) => a + v, 0), d.unit)}</td>
                  <td>{e === d.chosen ? <Pill t="In use" c="info" /> : <button className="btn sm" onClick={() => setUI({ fcMethod: e.m.id })}>Use</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="card-head">
          <div><h2>Plan for the next 3 months, by product</h2><div className="small muted">Plan = the higher of the statistical forecast and booked orders + weighted pipeline. {ed ? "Change a plan quantity to override it." : ""}</div></div>
          <span className="small muted">Plan value {inrShort(planTot)}</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Product</th><th>Last 12 months</th><th>Method · accuracy</th><th className="num">Statistical</th><th className="num">Booked</th><th className="num">Pipeline</th><th className="num">Plan</th><th className="num">Not yet booked</th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.code}>
                  <td style={{ minWidth: 170 }}>
                    <button className="linkish cell-title" onClick={() => { setUI({ fcSel: r.code + "|u" }); window.scrollTo(0, 0); }}>{r.f.name}</button>
                    <div className="cell-sub">{fcGroup(r.code)} · <span className="mono">{r.code}</span></div>
                  </td>
                  <td className="nowrap"><Spark y={r.y} /> <span className="small">{r.y.reduce((a: number, v: number) => a + v, 0)}</span></td>
                  <td className="small">{r.best.m.name}<div className="cell-sub">{r.best.acc == null ? "Low volume: not scored" : Math.round(r.best.acc * 100) + "% accurate"}</div></td>
                  <td className="num">{fcFmt(r.stat3, "u")}</td><td className="num">{r.firm || "—"}</td><td className="num">{r.pipe ? fcFmt(r.pipe, "u") : "—"}</td>
                  <td className="num">
                    {ed ? (
                      <>
                        <PlanInput key={r.code + ":" + r.plan} value={r.plan} onCommit={(v) => { setPlan(r.code, v); toast(`Plan for ${r.f.name} set to ${Math.max(0, Math.round(+v || 0))}`); }} label={`Plan quantity for ${r.f.name}`} />
                        {UI.fcPlan[r.code] != null && UI.fcPlan[r.code] !== r.consensus && <div className="cell-sub">overridden</div>}
                      </>
                    ) : r.plan}
                  </td>
                  <td className="num cell-title">{r.unbooked || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="card-head">
          <div><h2>Raw material needed for the unbooked plan</h2><div className="small muted">BOM × “not yet booked” quantities, after open sales orders take what they need from stock and open POs. Lets purchase buy long-lead items ahead of orders.</div></div>
          {canSee("mrp") && <button className="btn ghost sm" onClick={() => go("mrp")}>Material planning</button>}
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Material</th><th className="num">For open orders</th><th className="num">For forecast</th><th className="num">Stock + on order</th><th className="num">Extra to buy</th><th className="num">Value</th></tr></thead>
            <tbody>
              {mat.slice(0, 12).map((x: any) => (
                <tr key={x.r.code}>
                  <td style={{ minWidth: 180 }}><div className="cell-title" style={{ fontWeight: 500 }}>{x.r.name}</div><div className="cell-sub mono">{x.r.code}</div></td>
                  <td className="num">{qfmt(x.oq)} {x.r.uom}</td><td className="num">{qfmt(x.fq)} {x.r.uom}</td><td className="num">{qfmt(x.avail)} {x.r.uom}</td>
                  <td className="num" style={x.short > 0 ? { color: "var(--bad)", fontWeight: 600 } : undefined}>{x.short > 0 ? qfmt(Math.ceil(x.short)) + " " + x.r.uom : "—"}</td>
                  <td className="num">{x.short > 0 ? inr(Math.ceil(x.short) * x.r.rate) : "—"}</td>
                </tr>
              ))}
              {!mat.length && <tr><td colSpan={6} className="empty">Nothing extra to buy for the plan.</td></tr>}
            </tbody>
            {matShort.length > 0 && (
              <tfoot><tr><td colSpan={5}>Extra purchase value for the forecast</td><td className="num">{inr(matShort.reduce((s: number, x: any) => s + Math.ceil(x.short) * x.r.rate, 0))}</td></tr></tfoot>
            )}
          </table>
        </div>
      </section>
      <p className="small muted">History is sample data generated for the demo with a pharma buying pattern (FY-end peak Jan–Mar, CPhI in November, monsoon dip). Stage weights: leads 10–40%, quotations 20–50%.</p>
    </>
  );
}

/** Plan quantity: edited freely, applied on change (blur / Enter) like the prototype. */
function PlanInput({ value, onCommit, label }: { value: number; onCommit: (v: string) => void; label: string }) {
  const [v, setV] = useState(String(value));
  return (
    <input className="input num" type="number" min={0} step={1} value={v} style={{ width: 72 }} aria-label={label}
      onChange={(e) => setV(e.target.value)} onBlur={() => v !== String(value) && onCommit(v)}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
  );
}
