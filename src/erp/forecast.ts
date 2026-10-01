// @ts-nocheck
/*
 * Demand forecast engine: 12 months of (sample) sales history per product, six forecasting methods
 * backtested on the last 4 months, known demand from open orders and the CRM pipeline, and the
 * raw-material requirement for the unbooked plan. Ported from the Selvantra Technologies prototype.
 */
import { BOM, FG, LEADS, ORDERS, QUOTES, fgBy, onOrderQty, openOrders, rmBy, woOf } from "./engine";
import { TODAY, inrShort } from "./format";

export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Seasonality of Indian pharma capex: FY-end budgets (Jan–Mar), CPhI expo (Nov), monsoon dip (Jul–Aug).
const SEASON_RAW = [1.15, 1.2, 1.35, 0.8, 0.85, 0.9, 0.8, 0.85, 0.95, 1.0, 1.1, 1.05];
export const SEASON = SEASON_RAW.map((x) => x / (SEASON_RAW.reduce((s, v) => s + v, 0) / 12));
export const FC_HIST_N = 12;
export const fcMonths = (() => {
  const out = [];
  for (let k = -FC_HIST_N; k < 6; k++) {
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth() + k, 1);
    out.push({ m: d.getMonth(), y: d.getFullYear(), label: `${MON[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, hist: k < 0, cur: k === 0 });
  }
  return out;
})();
function fcRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const fcHash = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

// Dummy history: [code, base units per month, monthly growth]
export const FC_ITEMS = [
  ["FG-EBP", 1.2, 0.02], ["FG-EB160", 0.8, 0.03], ["FG-EB140", 0.5, 0], ["FG-DB4S", 0.6, 0.01], ["FG-DB2S", 0.9, 0.01], ["FG-DBA", 1.5, 0.02], ["FG-DBM", 1.8, 0.01], ["FG-TF", 1.0, 0.04],
  ["CP-PVC", 4.5, 0.02], ["CP-ALU", 3.0, 0.03], ["CP-CTN", 1.5, 0], ["CP-DFR", 2.0, 0.02], ["SP-KIT-BL", 3, 0.01], ["SP-2Y-BL", 1, 0.02], ["SV-AMC", 2.5, 0.02],
].filter(([c]) => fgBy[c]);
export const FC_HIST = {};
FC_ITEMS.forEach(([code, base, g]) => {
  const rnd = fcRng(fcHash(code));
  let carry = 0;
  FC_HIST[code] = fcMonths.slice(0, FC_HIST_N).map((mo, t) => {
    const mean = base * Math.pow(1 + g, t) * SEASON[mo.m];
    const z = (rnd() + rnd() + rnd() - 1.5) * 0.9;
    const v = Math.max(0, mean * (1 + 0.22 * z) + carry);
    const q = Math.round(v);
    carry = v - q;
    return q;
  });
});
export const fcGroup = (code) => { const f = fgBy[code]; return f.kind === "machine" ? "Machines" : f.kind === "part" ? "Change parts" : "Spares and services"; };

// ---- Methods: each takes history y, calendar months of the horizon, returns forecasts
const fcMean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
function sesFit(y, a) { let l = y[0], sse = 0; for (let i = 1; i < y.length; i++) { const e = y[i] - l; sse += e * e; l = a * y[i] + (1 - a) * l; } return { l, sse }; }
function holtFit(y, a, b) {
  let l = y[0], t = y.length > 1 ? y[1] - y[0] : 0, sse = 0;
  for (let i = 1; i < y.length; i++) { const f = l + t, e = y[i] - f; sse += e * e; const nl = a * y[i] + (1 - a) * (l + t); t = b * (nl - l) + (1 - b) * t; l = nl; }
  return { l, t, sse };
}
export const FC_METHODS = [
  { id: "ma3", name: "Moving average (3 months)", desc: "Average of the last three months. Steady, ignores trend.", run: (y, hm, h) => Array(h).fill(fcMean(y.slice(-3))) },
  { id: "wma", name: "Weighted moving average", desc: "Last three months weighted 3 : 2 : 1, so recent months count more.", run: (y, hm, h) => { const n = y.length; const v = n >= 3 ? (3 * y[n - 1] + 2 * y[n - 2] + y[n - 3]) / 6 : fcMean(y); return Array(h).fill(v); } },
  { id: "ses", name: "Exponential smoothing", desc: "Smoothed level; the smoothing factor is tuned to the history.", run: (y, hm, h) => { let best = null; for (let a = 0.1; a < 0.95; a += 0.1) { const f = sesFit(y, a); if (!best || f.sse < best.sse) best = { ...f, a }; } return Array(h).fill(best.l); } },
  { id: "holt", name: "Holt trend", desc: "Smoothed level plus trend; follows growth or decline.", run: (y, hm, h) => { let best = null; for (const a of [0.1, 0.3, 0.5, 0.7]) for (const b of [0.05, 0.1, 0.2, 0.3]) { const f = holtFit(y, a, b); if (!best || f.sse < best.sse) best = f; } return Array.from({ length: h }, (_, k) => Math.max(0, best.l + (k + 1) * best.t)); } },
  { id: "lin", name: "Linear trend", desc: "Straight line fitted through all twelve months.", run: (y, hm, h) => { const n = y.length, xm = (n - 1) / 2, ym = fcMean(y); let sxy = 0, sxx = 0; y.forEach((v, i) => { sxy += (i - xm) * (v - ym); sxx += (i - xm) * (i - xm); }); const b = sxx ? sxy / sxx : 0, a = ym - b * xm; return Array.from({ length: h }, (_, k) => Math.max(0, a + b * (n + k))); } },
  { id: "seas", name: "Seasonal (pharma calendar)", desc: "Removes the FY-end, expo and monsoon pattern, smooths, then puts the pattern back.", run: (y, hm, h, ym) => { const d = y.map((v, i) => v / SEASON[ym[i]]); let best = null; for (let a = 0.1; a < 0.95; a += 0.1) { const f = sesFit(d, a); if (!best || f.sse < best.sse) best = f; } return hm.slice(0, h).map((m) => best.l * SEASON[m]); } },
];
// Backtest: forecast each of the last 4 months one step ahead from the months before it
export function fcEvaluate(y, ym, hm, h) {
  return FC_METHODS.map((m) => {
    let ae = 0, act = 0, bias = 0;
    const errs = [];
    for (let t = y.length - 4; t < y.length; t++) {
      const f = m.run(y.slice(0, t), [ym[t]], 1, ym.slice(0, t))[0];
      ae += Math.abs(y[t] - f); act += y[t]; bias += f - y[t]; errs.push(y[t] - f);
    }
    const wape = act ? ae / act : ae ? 1 : 0;
    const rmse = Math.sqrt(fcMean(errs.map((e) => e * e)));
    const low = act < 4;
    return { m, wape, mae: ae / 4, low, score: low ? ae / 4 : wape, acc: low ? null : Math.max(0, 1 - wape), bias: act ? bias / act : 0, rmse, fc: m.run(y, hm, h, ym) };
  });
}
// ---- Known demand: open orders (firm) and CRM pipeline (weighted by stage)
const FC_LEAD_P = { New: 0.1, Qualified: 0.25, Quoted: 0.4 }, FC_Q_P = { Draft: 0.2, "Pending approval": 0.35, "Needs clarification": 0.3, Approved: 0.5, Sent: 0.5 };
export function fcFirm(code) { return ORDERS.filter((o) => !o.dispatched).reduce((s, o) => s + o.lines.filter((l) => l.item === code).reduce((a, l) => a + Math.max(0, l.qty - (l.disp || 0)), 0), 0); }
export function fcPipe(code) {
  let s = 0;
  QUOTES.forEach((q) => { const p = FC_Q_P[q.status]; if (p) q.lines.forEach((l) => { if (l.item === code) s += l.qty * p; }); });
  LEADS.forEach((l) => { const p = FC_LEAD_P[l.stage]; if (p && l.item === code && !QUOTES.some((q) => q.lead === l.id)) s += l.qty * p; });
  return s;
}
export function fcSeries(sel) {
  const H = FC_HIST_N;
  const sum = (codes, val) => Array.from({ length: H }, (_, i) => codes.reduce((s, c) => s + FC_HIST[c][i] * val(c), 0));
  const codes = FC_ITEMS.map((x) => x[0]);
  if (sel === "all-rev") return { y: sum(codes, (c) => fgBy[c].price), label: "All products, revenue", unit: "₹", codes };
  if (sel === "all-units") { const cs = codes.filter((c) => fgBy[c].kind === "machine"); return { y: sum(cs, () => 1), label: "All machines, units", unit: "units", codes: cs }; }
  if (sel === "cp-units") { const cs = codes.filter((c) => fgBy[c].kind === "part"); return { y: sum(cs, () => 1), label: "All change parts, sets", unit: "sets", codes: cs }; }
  const [code, meas] = sel.split("|");
  if (meas === "rev") return { y: FC_HIST[code].map((v) => v * fgBy[code].price), label: `${fgBy[code].name}, revenue`, unit: "₹", codes: [code] };
  return { y: FC_HIST[code].slice(), label: `${fgBy[code].name}, units`, unit: fgBy[code].kind === "part" ? "sets" : "units", codes: [code] };
}
export function fcCompute(sel, methodId, h) {
  const s = fcSeries(sel);
  const ym = fcMonths.slice(0, FC_HIST_N).map((x) => x.m), hm = fcMonths.slice(FC_HIST_N).map((x) => x.m);
  const ev = fcEvaluate(s.y, ym, hm, h);
  const best = ev.reduce((a, b) => (b.score < a.score ? b : a));
  const chosen = methodId === "auto" ? best : ev.find((e) => e.m.id === methodId);
  const band = chosen.fc.map((v, k) => 1.28 * chosen.rmse * Math.sqrt(k + 1));
  const rev = s.unit === "₹";
  const known = s.codes.reduce((a, c) => a + (fcFirm(c) + fcPipe(c)) * (rev ? fgBy[c].price : 1), 0);
  const stat3 = chosen.fc.slice(0, 3).reduce((a, v) => a + v, 0);
  const lift = Math.max(0, known - stat3) / 3;
  const adj = chosen.fc.map((v, k) => (k < 3 ? v + lift : v));
  return { ...s, ev, best, chosen, band, adj, known, stat3, lift };
}
export const fcFmt = (v, unit) => (unit === "₹" ? inrShort(v) : (Math.round(v * 10) / 10).toLocaleString("en-IN"));

// ---- Planner quantities and material impact (next 3 months)
export function fcProductRows(plan) {
  return FC_ITEMS.map(([code]) => {
    const y = FC_HIST[code];
    const ym = fcMonths.slice(0, FC_HIST_N).map((x) => x.m), hm = fcMonths.slice(FC_HIST_N).map((x) => x.m);
    const ev = fcEvaluate(y, ym, hm, 3);
    const best = ev.reduce((a, b) => (b.score < a.score ? b : a));
    const stat3 = best.fc.reduce((a, v) => a + v, 0);
    const firm = fcFirm(code), pipe = fcPipe(code);
    const consensus = Math.ceil(Math.max(stat3, firm + pipe) - 0.25);
    const p = plan[code] != null ? plan[code] : consensus;
    return { code, f: fgBy[code], y, best, stat3, firm, pipe, consensus, plan: p, unbooked: Math.max(0, p - firm) };
  });
}
export function fcMaterial(rows) {
  const orderReq = {};
  openOrders().forEach((o) => o.lines.forEach((l) => { const w = woOf(o, l); if (w && w.issued) return; (BOM[l.item] || []).forEach((b) => (orderReq[b[1]] = (orderReq[b[1]] || 0) + b[2] * Math.max(0, l.qty - (l.disp || 0)))); }));
  const fcReq = {};
  rows.forEach((r) => (BOM[r.code] || []).forEach((b) => (fcReq[b[1]] = (fcReq[b[1]] || 0) + b[2] * r.unbooked)));
  return Object.keys(fcReq)
    .map((code) => {
      const r = rmBy[code];
      if (!r || r.service) return null;
      const oq = orderReq[code] || 0, fq = fcReq[code];
      const avail = r.onHand + onOrderQty(code);
      const shortAll = Math.max(0, oq + fq - avail), shortOrd = Math.max(0, oq - avail);
      return { r, oq, fq, avail, short: shortAll - shortOrd };
    })
    .filter(Boolean)
    .sort((a, b) => b.short * b.r.rate - a.short * a.r.rate);
}
export { FG };
