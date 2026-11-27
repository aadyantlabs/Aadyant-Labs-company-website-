"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { chip, demoNote, field, inr, label, panel } from "./ui";

// ---- demo data: deterministic, so server and client render the same numbers ----
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const END = Date.UTC(2026, 10, 26); // fixed "today" for the demo
const DAY = 86_400_000;

function series(days: number) {
  let s = 7;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: days }, (_, i) => {
    const t = END - (days - 1 - i) * DAY, d = new Date(t);
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6 ? 1.25 : 1;
    const revenue = Math.round((30000 + i * 120) * weekend * (0.85 + rand() * 0.3) / 10) * 10;
    return { label: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`, revenue, orders: Math.round(revenue / (900 + rand() * 300)) };
  });
}
const ALL = series(180); // 90 shown at most + the previous period for comparison

const ORDERS = [
  ["#1048", "Meera Iyer", 2450, "Paid"], ["#1047", "Rohan Das", 1180, "Pending"], ["#1046", "Sara Khan", 3890, "Paid"],
  ["#1045", "Arjun Nair", 760, "Refunded"], ["#1044", "Priya Shah", 1520, "Paid"], ["#1043", "Kabir Mehta", 2210, "Pending"],
  ["#1042", "Ananya Rao", 990, "Paid"], ["#1041", "Dev Patel", 4300, "Paid"], ["#1040", "Isha Gupta", 1340, "Refunded"],
] as const;
const STATUS_ICON = { Paid: "✓", Pending: "…", Refunded: "↺" } as const;
type Status = keyof typeof STATUS_ICON;

const RANGES = [7, 30, 90] as const;
const compact = (n: number) => (n >= 1000 ? `₹${Math.round(n / 1000)}k` : inr(n));
const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);

/** Concept dashboard: KPI tiles, a revenue bar chart with tooltip and table view, and a filterable orders table. */
export default function PulseDashboard() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [active, setActive] = useState<number | null>(null);
  const [status, setStatus] = useState<Status | "All">("All");
  const [query, setQuery] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(box.current!);
    return () => ro.disconnect();
  }, []);

  const days = ALL.slice(-range);
  const prev = ALL.slice(-range * 2, -range);
  const sum = (a: typeof days, k: "revenue" | "orders") => a.reduce((s, d) => s + d[k], 0);
  const rev = sum(days, "revenue"), ord = sum(days, "orders");
  const kpis = [
    { name: "Revenue", value: inr(rev), delta: pct(rev, sum(prev, "revenue")) },
    { name: "Orders", value: ord.toLocaleString("en-IN"), delta: pct(ord, sum(prev, "orders")) },
    { name: "Avg order", value: inr(Math.round(rev / ord)), delta: pct(rev / ord, sum(prev, "revenue") / sum(prev, "orders")) },
  ];

  // chart geometry, in real pixels
  const H = 220, pad = { l: 44, r: 8, t: 12, b: 24 };
  const plotW = Math.max(100, width - pad.l - pad.r), plotH = H - pad.t - pad.b;
  const max = Math.ceil(Math.max(...days.map((d) => d.revenue)) / 20000) * 20000;
  const step = plotW / days.length, barW = Math.min(24, Math.max(1, step - 2));
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const bar = (i: number, v: number) => {
    const x = pad.l + i * step + (step - barW) / 2, top = y(v), h = pad.t + plotH - top, r = Math.min(4, barW / 2, h);
    return `M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${top + h}Z`;
  };
  const xTicks = [0, Math.floor(days.length / 2), days.length - 1];

  const rows = useMemo(
    () => ORDERS.filter(([, name, , s]) => (status === "All" || s === status) && name.toLowerCase().includes(query.trim().toLowerCase())),
    [status, query],
  );
  const hovered = active !== null ? days[active] : null;

  return (
    <div id="demo" className="mt-10 grid scroll-mt-28 gap-4">
      {/* Filters live in one row above the data */}
      <div role="group" aria-label="Date range" className="flex flex-wrap items-center gap-2">
        <span className={label}>Range</span>
        {RANGES.map((r) => (
          <button key={r} type="button" aria-pressed={range === r} onClick={() => { setRange(r); setActive(null); }} className={chip}>
            {r} days
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.name} className={`${panel} grid gap-1 p-5`}>
            <span className={label}>{k.name}</span>
            {/* Mono, not Syne: Syne's wide figures overflow a third-width tile at ₹16,24,290 */}
            <span className="truncate font-mono text-2xl font-medium tabular-nums lg:text-3xl">{k.value}</span>
            <span className="font-mono text-xs text-muted tabular-nums">
              <span aria-hidden="true">{k.delta >= 0 ? "▲" : "▼"}</span> {k.delta >= 0 ? "+" : ""}{k.delta}% vs previous {range} days
            </span>
          </div>
        ))}
      </div>

      <section aria-label="Daily revenue" className={`${panel} grid gap-3 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-lg font-extrabold">Daily revenue</h3>
          <p aria-live="polite" className="font-mono text-xs text-muted tabular-nums">
            {hovered ? `${hovered.label} · ${inr(hovered.revenue)} · ${hovered.orders} orders` : "Hover or use arrow keys on the chart"}
          </p>
        </div>
        <div ref={box} className="relative">
          <svg
            width={width}
            height={H}
            viewBox={`0 0 ${width} ${H}`}
            role="img"
            aria-label={`Daily revenue for the last ${range} days, from ${inr(Math.min(...days.map((d) => d.revenue)))} to ${inr(Math.max(...days.map((d) => d.revenue)))}.`}
            tabIndex={0}
            className="block h-auto max-w-full rounded-md focus-visible:outline-2 focus-visible:outline-accent"
            onPointerMove={(e) => {
              const x = e.clientX - e.currentTarget.getBoundingClientRect().left - pad.l;
              setActive(x < 0 || x > plotW ? null : Math.min(days.length - 1, Math.floor(x / step)));
            }}
            onPointerLeave={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              setActive((a) => Math.max(0, Math.min(days.length - 1, (a ?? days.length) + (e.key === "ArrowLeft" ? -1 : 1))));
            }}
            onBlur={() => setActive(null)}
          >
            {[0, max / 2, max].map((v) => (
              <g key={v}>
                <line x1={pad.l} x2={pad.l + plotW} y1={y(v)} y2={y(v)} stroke="var(--t-line)" strokeWidth="1" />
                <text x={pad.l - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--t-muted)" className="font-mono">{compact(v)}</text>
              </g>
            ))}
            {days.map((d, i) => (
              <path key={d.label} d={bar(i, d.revenue)} fill="var(--t-accent)" opacity={active === null || active === i ? 1 : 0.4} />
            ))}
            {xTicks.map((i) => (
              <text key={i} x={pad.l + i * step + step / 2} y={H - 6} fontSize="11" fill="var(--t-muted)" textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} className="font-mono">
                {days[i].label}
              </text>
            ))}
          </svg>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-mono text-xs text-muted">Show data as a table</summary>
          <div className="mt-3 max-h-64 overflow-auto">
            <table className="w-full text-left tabular-nums">
              <thead className="text-muted"><tr><th className="py-1 font-normal">Day</th><th className="font-normal">Revenue</th><th className="font-normal">Orders</th></tr></thead>
              <tbody>{days.map((d) => <tr key={d.label} className="border-t border-line"><td className="py-1">{d.label}</td><td>{inr(d.revenue)}</td><td>{d.orders}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      </section>

      <section aria-label="Recent orders" className={`${panel} grid gap-4 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-display text-lg font-extrabold">Recent orders</h3>
          <div className="grid gap-1">
            <label htmlFor="pd-search" className={label}>Search customer</label>
            <input id="pd-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Meera" className={`${field} py-2`} />
          </div>
        </div>
        <div role="group" aria-label="Order status" className="flex flex-wrap gap-2">
          {(["All", "Paid", "Pending", "Refunded"] as const).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={chip}>{s}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm tabular-nums">
            <thead className="text-muted"><tr><th className="py-2 font-normal">Order</th><th className="font-normal">Customer</th><th className="font-normal">Amount</th><th className="font-normal">Status</th></tr></thead>
            <tbody aria-live="polite">
              {rows.map(([id, name, amount, s]) => (
                <tr key={id} className="border-t border-line">
                  <td className="py-2 font-mono text-muted">{id}</td>
                  <td>{name}</td>
                  <td>{inr(amount)}</td>
                  <td><span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs"><span aria-hidden="true">{STATUS_ICON[s]}</span>{s}</span></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={4} className="py-4 text-muted">No orders match. Try another name or status.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className={demoNote}>Concept demo with sample data. No real customers or orders.</p>
      </section>
    </div>
  );
}
