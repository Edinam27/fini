"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  TrendingUp,
  CalendarClock,
  PiggyBank,
  AlertTriangle,
  Landmark,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { StatCard } from "@/components/stat-card";
import {
  IncomeExpenseTrend,
  SpendingTrend,
  SpendingDonut,
  EmptyChart,
} from "@/components/charts";
import { DarkActionCard, ReviewCard, AccountStatusCard, SectionCard } from "@/components/widgets";
import { apiGet } from "@/lib/client";
import { currencySymbol } from "@/lib/constants";
import { formatMoney, formatDate } from "@/lib/format";

interface DashboardData {
  currency: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  portfolioValue: number;
  portfolioReturn: number;
  upcomingBillsTotal: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  alerts: string[];
  spendingSeries: Array<{ day: string; category: string; amount: string }>;
  trendSeries: Array<{ day: string; income: string; expenses: string }>;
  categoryTotals: Array<{ category: string; amount: string }>;
  recentTransactions: Array<{
    id: number;
    date: string;
    category: string;
    subcategory: string | null;
    transaction_type: string;
    amount: string;
    description: string | null;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<DashboardData>("/api/dashboard")
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Could not load dashboard")
      );
  }, []);

  const sym = currencySymbol(data?.currency ?? "USD");

  if (error) {
    return (
      <>
        <AppHeader title="Financial Dashboard" subtitle="Your money at a glance" />
        <div className="badge badge-red">{error}</div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <AppHeader title="Financial Dashboard" subtitle="Your money at a glance" />
        <div className="grid animate-pulse gap-6 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-[#E2E8F0] bg-white" />
          ))}
          <div className="h-80 rounded-2xl border border-[#E2E8F0] bg-white lg:col-span-2" />
          <div className="h-80 rounded-2xl border border-[#E2E8F0] bg-white" />
        </div>
      </>
    );
  }

  // Build pivot for spending trend.
  const spendDays = [...new Set(data.spendingSeries.map((s) => s.day))];
  const spendCategories = [...new Set(data.spendingSeries.map((s) => s.category))];
  const spendData = spendDays.map((day) => {
    const row: { day: string; [category: string]: string | number } = { day };
    for (const c of spendCategories) {
      row[c] = data.spendingSeries
        .filter((s) => s.day === day && s.category === c)
        .reduce((a, s) => a + Number(s.amount), 0);
    }
    return row;
  });

  const trendData = data.trendSeries.map((t) => ({
    day: t.day,
    income: Number(t.income),
    expenses: Number(t.expenses),
  }));

  const savingsPositive = data.monthlySavings >= 0;

  return (
    <>
      <AppHeader
        title="Financial Dashboard"
        subtitle="Your money at a glance — updated live from your Neon database"
      />

      {data.alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {data.alerts.map((alert) => (
            <div key={alert} className="badge badge-amber w-full justify-start rounded-xl px-4 py-3">
              <AlertTriangle size={16} />
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Statistics grid */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Net Worth"
          value={data.netWorth}
          icon={Wallet}
          color="#EF4444"
          currencySymbol={sym}
        />
        <StatCard
          label="Portfolio Value"
          value={data.portfolioValue}
          icon={TrendingUp}
          color="#3B82F6"
          delta={data.portfolioReturn * 100}
          currencySymbol={sym}
        />
        <StatCard
          label="Upcoming Bills (7 days)"
          value={data.upcomingBillsTotal}
          icon={CalendarClock}
          color="#F59E0B"
          currencySymbol={sym}
        />
        <StatCard
          label="Savings This Month"
          value={data.monthlySavings}
          icon={PiggyBank}
          color="#10B981"
          currencySymbol={sym}
          deltaText={savingsPositive ? "Income exceeds expenses" : "Overspending detected"}
        />
      </div>

      {/* Main body: 2/3 charts + 1/3 widgets */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Income vs expense trend */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-[#0F172A]">
                Income vs Expenses — 90 days
              </h3>
            </div>
            {trendData.length > 0 ? (
              <IncomeExpenseTrend data={trendData} />
            ) : (
              <EmptyChart message="No trend data yet — add some transactions to see it." />
            )}
          </div>

          {/* Spending trend */}
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-[#0F172A]">
                Spending Trends — 30 days
              </h3>
            </div>
            {spendData.length > 0 ? (
              <SpendingTrend data={spendData} categories={spendCategories} />
            ) : (
              <EmptyChart message="No spending data available for the last 30 days." />
            )}
          </div>

          {/* Recent transactions */}
          <SectionCard title="Recent Transactions" viewAllHref="/transactions">
            {data.recentTransactions.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-[#64748B]">
                No transactions to display.
              </p>
            ) : (
              data.recentTransactions.map((t) => {
                const isIncome = t.transaction_type === "Income";
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-4 px-6 py-4 transition-all duration-200 hover:bg-[#F8FAFC] not-last:border-b not-last:border-[#E2E8F0]"
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: isIncome ? "#F0FDF4" : "#FEF2F2" }}
                    >
                      <Landmark size={18} style={{ color: isIncome ? "#10B981" : "#EF4444" }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#0F172A]">
                        {t.description || t.category}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {formatDate(t.date)} · {t.category}
                        {t.subcategory ? ` · ${t.subcategory}` : ""}
                      </p>
                    </div>
                    <span
                      className={`font-heading text-sm font-bold ${
                        isIncome ? "text-green-600" : "text-[#0F172A]"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      {formatMoney(Number(t.amount), sym)}
                    </span>
                  </div>
                );
              })
            )}
          </SectionCard>
        </div>

        {/* Secondary widgets */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="mb-4 font-heading text-base font-bold text-[#0F172A]">
              Spending by Category — 30 days
            </h3>
            {data.categoryTotals.length > 0 ? (
              <SpendingDonut
                data={data.categoryTotals.map((c) => ({
                  category: c.category,
                  amount: Number(c.amount),
                }))}
                symbol={sym}
              />
            ) : (
              <EmptyChart message="No expenses recorded yet." />
            )}
          </div>

          <DarkActionCard
            title="Set your 2026 budget"
            body="You have unallocated income this month. Assign every amount a job before it disappears."
            cta="Plan Budget"
            href="/budget"
          />

          <ReviewCard />

          <AccountStatusCard
            items={[
              { label: "Budget alerts", sub: "Watching 8 categories", state: "ok" },
              { label: "Bill reminders", sub: "Synced to your due dates", state: "info" },
              { label: "Market feed", sub: "Live stock prices active", state: "ok" },
            ]}
          />
        </div>
      </div>
    </>
  );
}
