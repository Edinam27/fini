"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2, ArrowLeftRight, Download } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { apiGet, apiSend } from "@/lib/client";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/constants";
import { formatMoney, todayISO } from "@/lib/format";
import { useCurrencySymbol } from "@/lib/use-currency";

interface Transaction {
  id: number;
  transaction_type: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  amount: string;
  payment_method: string | null;
  recurring: boolean;
  tags: string | null;
  date: string;
}

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export default function TransactionsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [type, setType] = useState<"Expense" | "Income">("Expense");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<string>("Food");
  const [subcategory, setSubcategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [recurring, setRecurring] = useState(false);
  const [tags, setTags] = useState("");

  // Filters
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sort, setSort] = useState("date-desc");

  const sym = useCurrencySymbol();

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (filterCategory) params.set("category", filterCategory);
      params.set("sort", sort);
      setRows(await apiGet<Transaction[]>(`/api/transactions?${params.toString()}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterCategory) params.set("category", filterCategory);
    params.set("sort", sort);
    apiGet<Transaction[]>(`/api/transactions?${params.toString()}`)
      .then((d) => {
        if (!active) return;
        setRows(d);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Load failed");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filterType, filterCategory, sort]);

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiSend("/api/transactions", "POST", {
        transaction_type: type,
        date,
        category,
        subcategory: subcategory || null,
        amount: Number(amount),
        description: description || null,
        payment_method: paymentMethod,
        recurring,
        tags: tags || null,
      });
      setSuccess("Transaction added successfully!");
      setAmount("");
      setDescription("");
      setSubcategory("");
      setTags("");
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await apiSend(`/api/transactions?id=${id}`, "DELETE");
      setRows((prev) => prev.filter((r) => r.id !== id));
      setSuccess("Transaction deleted!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const totals = useMemo(() => {
    const income = rows
      .filter((r) => r.transaction_type === "Income")
      .reduce((a, r) => a + Number(r.amount), 0);
    const expenses = rows
      .filter((r) => r.transaction_type === "Expense")
      .reduce((a, r) => a + Number(r.amount), 0);
    return { income, expenses };
  }, [rows]);

  const categories = type === "Expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <>
      <AppHeader
        title="Transaction Management"
        subtitle="Add, filter and organize every dollar in and out"
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={18} />
          {showForm ? "Close" : "Add New Transaction"}
        </button>
        <a className="btn btn-ghost" href="/api/export">
          <Download size={18} />
          Export CSV
        </a>
        <div className="ml-auto flex gap-2">
          <span className="badge badge-green">Income {formatMoney(totals.income, sym)}</span>
          <span className="badge badge-red">Expenses {formatMoney(totals.expenses, sym)}</span>
        </div>
      </div>

      {error && <div className="badge badge-red mb-4 w-full justify-start rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="badge badge-green mb-4 w-full justify-start rounded-xl px-4 py-3">{success}</div>}

      {showForm && (
        <form onSubmit={addTransaction} className="card mb-6 p-6">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              className={`tab ${type === "Expense" ? "active" : ""}`}
              onClick={() => { setType("Expense"); setCategory("Food"); }}
            >
              Expense
            </button>
            <button
              type="button"
              className={`tab ${type === "Income" ? "active" : ""}`}
              onClick={() => { setType("Income"); setCategory("Salary"); }}
            >
              Income
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="field-label">Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="field-label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Amount</label>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label">Subcategory (optional)</label>
              <input className="input" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Description</label>
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Payment Method</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Tags (comma-separated)</label>
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 self-end text-sm text-[#0F172A]">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="h-4 w-4 accent-[#EF4444]"
              />
              Recurring transaction
            </label>
            <div className="flex items-end">
              <button className="btn btn-primary w-full" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                Add Transaction
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="card mb-6 grid gap-4 p-6 sm:grid-cols-3">
        <div>
          <label className="field-label">Transaction Type</label>
          <select className="input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All types</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>
        </div>
        <div>
          <label className="field-label">Filter by Category</label>
          <select className="input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Sort by</label>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="date-desc">Date (Latest)</option>
            <option value="date-asc">Date (Oldest)</option>
            <option value="amount-desc">Amount (Highest)</option>
            <option value="amount-asc">Amount (Lowest)</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="font-heading text-base font-bold text-[#0F172A]">Transaction History</h3>
          <span className="text-sm text-[#64748B]">{rows.length} records</span>
        </div>
        <div className="border-t border-[#E2E8F0]">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#64748B]">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-[#64748B]">
              <ArrowLeftRight size={24} className="mb-2" />
              <p className="text-sm">No transactions match these filters.</p>
            </div>
          ) : (
            rows.map((r) => {
              const isIncome = r.transaction_type === "Income";
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-4 px-6 py-4 transition-all duration-200 hover:bg-[#F8FAFC] not-last:border-b not-last:border-[#E2E8F0]"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: isIncome ? "#F0FDF4" : "#FEF2F2" }}
                  >
                    <ArrowLeftRight size={18} style={{ color: isIncome ? "#10B981" : "#EF4444" }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#0F172A]">
                      {r.description || r.category}
                      {r.recurring && <span className="badge badge-blue ml-2">Recurring</span>}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      {r.date} · {r.category}
                      {r.subcategory ? ` · ${r.subcategory}` : ""}
                      {r.payment_method ? ` · ${r.payment_method}` : ""}
                      {r.tags ? ` · ${r.tags}` : ""}
                    </p>
                  </div>
                  <span className="hidden w-20 text-right sm:block">
                    <span className={`badge ${isIncome ? "badge-green" : "badge-slate"}`}>
                      {r.transaction_type}
                    </span>
                  </span>
                  <span
                    className={`w-28 text-right font-heading text-sm font-bold ${
                      isIncome ? "text-green-600" : "text-[#0F172A]"
                    }`}
                  >
                    {isIncome ? "+" : "−"}
                    {formatMoney(Number(r.amount), sym)}
                  </span>
                  <button
                    onClick={() => remove(r.id)}
                    title="Delete"
                    className="rounded-lg p-2 text-[#94A3B8] transition-all duration-200 hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
