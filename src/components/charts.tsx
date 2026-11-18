"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

const BRAND_PALETTE = [
  "#EF4444",
  "#0F172A",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#14B8A6",
  "#EC4899",
];

interface TrendPoint {
  day: string;
  income: number;
  expenses: number;
}

export function IncomeExpenseTrend({
  data,
  symbol = "$",
}: {
  data: TrendPoint[];
  symbol?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F172A" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#0F172A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#64748B" }}
          tickFormatter={(v: string) => v.slice(5)}
          tickLine={false}
          axisLine={{ stroke: "#E2E8F0" }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748B" }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v: number) => `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}`}
        />
        <Tooltip
          formatter={(value: unknown, name: unknown) => [
            `${symbol}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            String(name),
          ]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #E2E8F0",
            fontSize: 13,
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="#EF4444"
          strokeWidth={2}
          fill="url(#gIncome)"
        />
        <Area
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke="#0F172A"
          strokeWidth={2}
          fill="url(#gExpenses)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface SpendPoint {
  day: string;
  [category: string]: string | number;
}

export function SpendingTrend({
  data,
  categories,
  symbol = "$",
}: {
  data: SpendPoint[];
  categories: string[];
  symbol?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#64748B" }}
          tickFormatter={(v: string) => v.slice(5)}
          tickLine={false}
          axisLine={{ stroke: "#E2E8F0" }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748B" }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v: number) => `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}`}
        />
        <Tooltip
          formatter={(value: unknown, name: unknown) => [
            `${symbol}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            String(name),
          ]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #E2E8F0",
            fontSize: 13,
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {categories.map((cat, i) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={BRAND_PALETTE[i % BRAND_PALETTE.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SpendingDonut({
  data,
  symbol = "$",
}: {
  data: Array<{ category: string; amount: number }>;
  symbol?: string;
}) {
  const total = data.reduce((a, d) => a + d.amount, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={BRAND_PALETTE[i % BRAND_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: unknown, name: unknown) => [
              `${symbol}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
              String(name),
            ]}
            contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 13 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-[#64748B]">Total 30d</span>
        <span className="font-heading text-lg font-bold text-[#0F172A]">
          {symbol}
          {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] text-sm text-[#64748B]">
      {message}
    </div>
  );
}
