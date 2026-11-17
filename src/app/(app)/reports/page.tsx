"use client";

import { useEffect, useState } from "react";
import { Loader2, FileBarChart, Download, Sparkles, Lightbulb } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { apiSend } from "@/lib/client";
import { currencySymbol } from "@/lib/constants";
import { formatMoney, formatPercent } from "@/lib/format";

interface ReportData {
  period: string;
  report_type: string;
  income_expense: { income: number; expenses: number; net: number; savingsRate: number };
  category_breakdown: Array<{ category: string; income: string; expenses: string }>;
  investment_performance: { value: number; cost: number; returnPct: number };
  budget_performance: Array<{ category: string; budget: number; spent: number; percentage: number | null }>;
  savings_progress: Array<{ name: string; percentage: number; deadline: string | null }>;
  recommendations: string[];
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<"monthly" | "quarterly" | "annual">("monthly");

  async function fetchReport(type: "monthly" | "quarterly" | "annual") {
    const res = await apiSend<{ report: ReportData }>("/api/reports", "POST", {
      report_type: type,
    });
    setReport(res.report);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      await fetchReport(reportType);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report generation failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiSend<{ report: ReportData }>("/api/reports", "POST", { report_type: "monthly" })
      .then((res) => {
        if (active) setReport(res.report);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Report generation failed");
      });
    return () => {
      active = false;
    };
  }, []);

  const sym = currencySymbol("USD");

  return (
    <>
      <AppHeader
        title="Financial Reports & Analysis"
        subtitle="Generate period reports, see recommendations, export your data"
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          className="input w-auto"
          value={reportType}
          onChange={(e) => setReportType(e.target.value as typeof reportType)}
        >
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>
        <button className="btn btn-primary" onClick={generate} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <FileBarChart size={16} />}
          Generate Report
        </button>
        <a className="btn btn-ghost" href="/api/export">
          <Download size={16} />
          Export Transactions (CSV)
        </a>
      </div>

      {error && <div className="badge badge-red mb-4 w-full justify-start rounded-xl px-4 py-3">{error}</div>}

      {!report && !busy ? (
        <div className="card flex flex-col items-center py-20 text-[#64748B]">
          <FileBarChart size={28} className="mb-3" />
          <p className="text-sm">Generate a report to see your analysis.</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Headline numbers */}
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card p-6">
              <p className="text-sm text-[#64748B]">Income</p>
              <p className="font-heading text-2xl font-bold text-green-600">
                {formatMoney(report.income_expense.income, sym)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-[#64748B]">Expenses</p>
              <p className="font-heading text-2xl font-bold text-[#0F172A]">
                {formatMoney(report.income_expense.expenses, sym)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-[#64748B]">Net</p>
              <p
                className={`font-heading text-2xl font-bold ${
                  report.income_expense.net >= 0 ? "text-green-600" : "text-[#EF4444]"
                }`}
              >
                {formatMoney(report.income_expense.net, sym)}
              </p>
            </div>
            <div className="card p-6">
              <p className="text-sm text-[#64748B]">Savings Rate</p>
              <p className="font-heading text-2xl font-bold text-[#0F172A]">
                {report.income_expense.savingsRate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Category breakdown */}
            <div className="card overflow-hidden">
              <h3 className="px-6 py-4 font-heading text-base font-bold text-[#0F172A]">
                Category Breakdown
              </h3>
              <div className="border-t border-[#E2E8F0]">
                {report.category_breakdown.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-[#64748B]">
                    No transactions in this period.
                  </p>
                ) : (
                  report.category_breakdown.map((c, i) => (
                    <div
                      key={c.category}
                      className="flex items-center justify-between px-6 py-3 not-last:border-b not-last:border-[#E2E8F0]"
                    >
                      <span className="text-sm font-medium text-[#0F172A]">{c.category}</span>
                      <span className="flex gap-3 text-sm">
                        {Number(c.income) > 0 && (
                          <span className="text-green-600">+{formatMoney(Number(c.income), sym)}</span>
                        )}
                        {Number(c.expenses) > 0 && (
                          <span className="text-[#0F172A]">−{formatMoney(Number(c.expenses), sym)}</span>
                        )}
                        <span className="w-6 text-right text-xs text-[#94A3B8]">{i + 1}</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Budget performance */}
            <div className="card p-6">
              <h3 className="mb-4 font-heading text-base font-bold text-[#0F172A]">
                Budget Performance
              </h3>
              {report.budget_performance.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#64748B]">No budgets set yet.</p>
              ) : (
                <div className="space-y-4">
                  {report.budget_performance.map((b) => (
                    <div key={b.category}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-[#0F172A]">{b.category}</span>
                        <span className="text-[#64748B]">
                          {formatMoney(b.spent, sym)} / {formatMoney(b.budget, sym)}
                          {b.percentage !== null && (
                            <span className={`badge ml-2 ${b.percentage > 100 ? "badge-red" : "badge-green"}`}>
                              {b.percentage.toFixed(0)}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                        <div
                          className={`h-full rounded-full ${
                            (b.percentage ?? 0) > 100 ? "bg-[#EF4444]" : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(b.percentage ?? 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Investment performance */}
            <div className="card p-6">
              <h3 className="mb-4 font-heading text-base font-bold text-[#0F172A]">
                Investment Performance
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#64748B]">Current value</p>
                  <p className="font-heading text-xl font-bold text-[#0F172A]">
                    {formatMoney(report.investment_performance.value, sym)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Cost basis</p>
                  <p className="font-heading text-xl font-bold text-[#0F172A]">
                    {formatMoney(report.investment_performance.cost, sym)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Unrealized return</p>
                  <p
                    className={`font-heading text-xl font-bold ${
                      report.investment_performance.returnPct >= 0 ? "text-green-600" : "text-[#EF4444]"
                    }`}
                  >
                    {formatPercent(report.investment_performance.returnPct)}
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="card p-6">
              <h3 className="mb-4 flex items-center gap-2 font-heading text-base font-bold text-[#0F172A]">
                <Lightbulb size={18} className="text-[#F59E0B]" />
                Recommendations
              </h3>
              <ul className="space-y-3">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-[#334155]">
                    <Sparkles size={15} className="mt-0.5 shrink-0 text-[#EF4444]" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-20">
          <Loader2 size={22} className="animate-spin text-[#64748B]" />
        </div>
      )}
    </>
  );
}
