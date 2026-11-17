"use client";

import type { LucideIcon } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** Icon color, e.g. "#EF4444" — background is that color at 10% opacity. */
  color: string;
  /** Optional delta shown as a percentage badge. */
  delta?: number | null;
  /** Optional delta wording when no numeric percentage applies. */
  deltaText?: string;
  currencySymbol?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delta,
  deltaText,
  currencySymbol = "$",
}: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="card rise-in p-6 transition-all duration-200 hover:border-[#cbd5e1]">
      <div className="flex items-start justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `${color}1A` }}
        >
          <Icon size={20} style={{ color }} />
        </span>
        {delta !== undefined && delta !== null ? (
          <span className={`badge ${positive ? "badge-green" : "badge-red"}`}>
            {formatPercent(delta)}
          </span>
        ) : deltaText ? (
          <span className={`badge ${positive ? "badge-green" : "badge-red"}`}>
            {deltaText}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-sm text-[#64748B]">{label}</p>
      <p className="font-heading text-2xl font-bold text-[#0F172A]">
        {typeof value === "number" ? formatMoney(value, currencySymbol) : value}
      </p>
    </div>
  );
}

/** Theme-spec progress bar chart: rounded-top columns on a slate track. */
export function ProgressBarChart({
  data,
  height = 256,
}: {
  data: Array<{ label: string; value: number; max: number }>;
  height?: number;
}) {
  const globalMax = Math.max(...data.map((d) => d.max || d.value), 1);
  return (
    <div
      className="flex items-end justify-between gap-3"
      style={{ height }}
    >
      {data.map((d) => {
        const pct = Math.max(0, Math.min(100, ((d.value || 0) / globalMax) * 100));
        return (
          <div key={d.label} className="bar-col flex h-full w-full flex-col items-center justify-end gap-2">
            <span className="text-[11px] font-medium text-[#64748B]">
              {Math.round(pct)}%
            </span>
            <div className="relative w-full flex-1 rounded-t-lg bg-[#F8FAFC]">
              <div className="bar-fill" style={{ height: `${pct}%` }} />
            </div>
            <span className="truncate text-xs text-[#64748B]">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
