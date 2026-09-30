// Formatting and date helpers shared by every MEK-SEL ERP screen.

export const inr = (n: number) => "₹ " + Math.round(n).toLocaleString("en-IN");
export const inrShort = (n: number) =>
  n >= 1e7 ? "₹ " + (n / 1e7).toFixed(2) + " Cr" : n >= 1e5 ? "₹ " + (n / 1e5).toFixed(1) + " L" : inr(n);
export const qfmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-IN");

export const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const ds = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const daysFrom = (d: Date) => Math.round((d.getTime() - TODAY.getTime()) / 86400000);
export const fromIso = (s: string) => new Date(s + "T00:00:00");
export const nowTime = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
export const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export function inWords(n: number) {
  n = Math.round(n);
  if (n === 0) return "Zero";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number) => (x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? " " + a[x % 10] : ""));
  const three = (x: number) =>
    (x >= 100 ? a[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " and " : "") : "") + (x % 100 ? two(x % 100) : "");
  const parts: string[] = [];
  const cr = Math.floor(n / 1e7);
  n %= 1e7;
  const lk = Math.floor(n / 1e5);
  n %= 1e5;
  const th = Math.floor(n / 1e3);
  n %= 1e3;
  if (cr) parts.push(three(cr) + " Crore");
  if (lk) parts.push(two(lk) + " Lakh");
  if (th) parts.push(two(th) + " Thousand");
  if (n) parts.push(three(n));
  return parts.join(" ");
}

/** Parse a number from a form field; empty or invalid → 0. */
export const num = (v: string | number | undefined | null) => {
  const x = typeof v === "number" ? v : parseFloat(v ?? "");
  return isNaN(x) ? 0 : x;
};
