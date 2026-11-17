"use client";

import { useEffect, useState } from "react";
import { Loader2, PiggyBank, AlertTriangle, Save, ClipboardList } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { StatCard, ProgressBarChart } from "@/components/stat-card";
import { apiGet, apiSend } from "@/lib/client";
import { INCOME_SOURCES, EXPENSE_CATEGORIES, currencySymbol } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

interface BudgetData {
  month: string;
  incomeSources: Record<string, number>;
  totalIncome: number;
  categories: Array<{ category: string; budget: number; spent: number }>;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  alerts: string[];
  threshold: number;
}

export default function BudgetPage() {
  const [tab, setTab] = useState<"planner" | "tracking">("planner");
  const [data, setData] = useState<BudgetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [income, setIncome] = useState<Record<string, number>>({});
  const [budgets, setBudgets] = useState<Record<string, number>>({});

  async function load() {
    try {
      const d = await apiGet<BudgetData>("/api/budget");
      setData(d);
      setIncome(d.incomeSources ?? {});
      setBudgets(Object.fromEntries(d.categories.map((c) => [c.category, c.budget])));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }

  useEffect(() => {
    let active = true;
    apiGet<BudgetData>("/api/budget").then((d) => {
      if (!active) return;
      setData(d);
      setIncome(d.incomeSources ?? {});
      setBudgets(Object.fromEntries(d.categories.map((c) => [c.category, c.budget])));
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : "Load failed");
    });
    return () => {
      active = false;
    };
  }, []);

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiSend("/api/budget", "POST", { income, budgets });
      setSuccess("Budget saved successfully!");
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const sym = currencySymbol("USD");
  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const remaining = totalIncome - totalBudget;

  return (
    <>
      <AppHeader
        title="Budget"
        subtitle="Plan where money goes, then track how it actually went"
      />

      <div className="mb-6 flex gap-2">
        <button className={`tab ${tab === "planner" ? "active" : ""}`} onClick={() => setTab("planner")}>
          <PiggyBank size={16} className="mr-1 inline" /> Budget Planner
        </button>
        <button className={`tab ${tab === "tracking" ? "active" : ""}`} onClick={() => setTab("tracking")}>
          <ClipboardList size={16} className="mr-1 inline" /> Budget Tracking
        </button>
      </div>

      {error && <div className="badge badge-red mb-4 w-full justify-start rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="badge badge-green mb-4 w-full justify-start rounded-xl px-4 py-3">{success}</div>}

      {tab === "planner" && (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard label="Total Monthly Income" value={totalIncome} icon={PiggyBank} color="#10B981" currencySymbol={sym} />
            <StatCard label="Total Monthly Budget" value={totalBudget} icon={ClipboardList} color="#3B82F6" currencySymbol={sym} />
            <StatCard
              label="Monthly Surplus / Deficit"
              value={remaining}
              icon={AlertTriangle}
              color={remaining >= 0 ? "#10B981" : "#EF4444"}
              currencySymbol={sym}
              deltaText={totalIncome > 0 ? `${((remaining / totalIncome) * 100).toFixed(1)}% of income` : "0%"}
            />
          </div>

          <form onSubmit={saveBudget} className="card p-6">
            <h3 className="mb-4 font-heading text-base font-bold text-[#0F172A]">Monthly Income</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {INCOME_SOURCES.map((source) => (
                <div key={source}>
                  <label className="field-label">{source} Income</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="10"
                    value={income[source] ?? 0}
                    onChange={(e) =>
                      setIncome((prev) => ({ ...prev, [source]: Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </div>

            <h3 className="mb-4 mt-8 font-heading text-base font-bold text-[#0F172A]">
              Monthly Expenses Budget
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {EXPENSE_CATEGORIES.map((category) => (
                <div key={category}>
                  <label className="field-label">{category} Budget</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="10"
                    value={budgets[category] ?? 0}
                    onChange={(e) =>
                      setBudgets((prev) => ({ ...prev, [category]: Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </div>

            <button className="btn btn-primary mt-6" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Budget
            </button>
          </form>
        </div>
      )}

      {tab === "tracking" && (
        <div className="space-y-6">
          {data && data.alerts.length > 0 && (
            <div className="space-y-2">
              {data.alerts.map((a) => (
                <div key={a} className="badge badge-amber w-full justify-start rounded-xl px-4 py-3">
                  <AlertTriangle size={16} />
                  {a}
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-3">
            <StatCard label={`Spent ${data?.month ?? ""}`} value={data?.totalSpent ?? 0} icon={PiggyBank} color="#EF4444" currencySymbol={sym} />
            <StatCard label="Budgeted" value={data?.totalBudget ?? 0} icon={ClipboardList} color="#3B82F6" currencySymbol={sym} />
            <StatCard
              label="Remaining Income"
              value={(data?.totalIncome ?? 0) - (data?.totalSpent ?? 0)}
              icon={AlertTriangle}
              color="#10B981"
              currencySymbol={sym}
            />
          </div>

          <div className="card p-6">
            <h3 className="mb-4 font-heading text-base font-bold text-[#0F172A]">
              Category Progress
            </h3>
            {data && data.categories.length > 0 ? (
              <div className="space-y-5">
                {data.categories.map((c) => {
                  const pct = c.budget > 0 ? (c.spent / c.budget) * 100 : c.spent > 0 ? 100 : 0;
                  const over = pct > 100;
                  const near = !over && pct >= (data.threshold ?? 80);
                  return (
                    <div key={c.category}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-[#0F172A]">{c.category}</span>
                        <span className="text-[#64748B]">
                          {formatMoney(c.spent, sym)} / {formatMoney(c.budget, sym)}
                          <span className={`badge ml-2 ${over ? "badge-red" : near ? "badge-amber" : "badge-green"}`}>
                            {pct.toFixed(1)}%
                          </span>
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            over ? "bg-[#EF4444]" : near ? "bg-[#F59E0B]" : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[#64748B]">
                No budgets yet — set them in the Budget Planner tab.
              </p>
            )}
          </div>

          {/* Spending mix as columns */}
          {data && data.categories.length > 0 && (
            <div className="card p-6">
              <h3 className="mb-4 font-heading text-base font-bold text-[#0F172A]">Spending Mix</h3>
              <ProgressBarChart
                data={data.categories
                  .filter((c) => c.spent > 0)
                  .slice(0, 8)
                  .map((c) => ({ label: c.category, value: c.spent, max: c.budget || c.spent }))}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
