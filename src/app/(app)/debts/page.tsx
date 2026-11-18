"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, CreditCard, Send, Trash2, Percent } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { StatCard } from "@/components/stat-card";
import { apiGet, apiSend } from "@/lib/client";
import { formatMoney, formatDate } from "@/lib/format";
import { useCurrencySymbol } from "@/lib/use-currency";

interface Debt {
  id: number;
  name: string;
  amount: string;
  interest_rate: string;
  minimum_payment: string;
  start_date: string;
}

interface DebtData {
  debts: Debt[];
  totalDebt: number;
  averageInterest: number | null;
}

export default function DebtsPage() {
  const [data, setData] = useState<DebtData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [payments, setPayments] = useState<Record<number, string>>({});

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [minPayment, setMinPayment] = useState("");

  async function load() {
    setLoading(true);
    try {
      setData(await apiGet<DebtData>("/api/debts"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiGet<DebtData>("/api/debts")
      .then((d) => {
        if (!active) return;
        setData(d);
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
  }, []);

  async function addDebt(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/debts", "POST", {
        name: name.trim(),
        amount: Number(amount),
        interest_rate: Number(interestRate || 0),
        minimum_payment: Number(minPayment || 0),
      });
      setSuccess("Debt added successfully!");
      setName("");
      setAmount("");
      setInterestRate("");
      setMinPayment("");
      setShowForm(false);
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function makePayment(debt: Debt) {
    const paymentAmount = Number(payments[debt.id] ?? 0);
    if (paymentAmount <= 0) {
      setError("Enter a payment amount.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiSend<{ remaining: number }>("/api/debts", "PATCH", {
        debt_id: debt.id,
        amount: paymentAmount,
      });
      setSuccess(
        res.remaining <= 0
          ? "Payment processed — this debt is fully cleared! 🎉"
          : "Payment processed successfully!"
      );
      setPayments((prev) => ({ ...prev, [debt.id]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await apiSend(`/api/debts?id=${id}`, "DELETE");
      setData((prev) => (prev ? { ...prev, debts: prev.debts.filter((d) => d.id !== id) } : prev));
      setSuccess("Debt removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const sym = useCurrencySymbol();

  return (
    <>
      <AppHeader
        title="Debt Management"
        subtitle="Track instalments, pay down balances, watch interest"
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={18} />
          {showForm ? "Close" : "Add New Debt"}
        </button>
      </div>

      {error && <div className="badge badge-red mb-4 w-full justify-start rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="badge badge-green mb-4 w-full justify-start rounded-xl px-4 py-3">{success}</div>}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Debt" value={data?.totalDebt ?? 0} icon={CreditCard} color="#EF4444" currencySymbol={sym} />
        <StatCard
          label="Average Interest Rate"
          value={`${(data?.averageInterest ?? 0).toFixed(1)}%`}
          icon={Percent}
          color="#F59E0B"
        />
        <StatCard label="Active Debts" value={String(data?.debts.length ?? 0)} icon={CreditCard} color="#3B82F6" />
      </div>

      {showForm && (
        <form onSubmit={addDebt} className="card mt-6 grid gap-4 p-6 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="field-label">Debt Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Amount</label>
            <input className="input" type="number" min="0.01" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Interest Rate (%)</label>
            <input className="input" type="number" min="0" max="100" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Minimum Monthly Payment</label>
            <input className="input" type="number" min="0" step="10" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              Add Debt
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="card flex justify-center py-16">
            <Loader2 size={20} className="animate-spin text-[#64748B]" />
          </div>
        ) : !data || data.debts.length === 0 ? (
          <div className="card flex flex-col items-center py-20 text-[#64748B]">
            <CreditCard size={28} className="mb-3" />
            <p className="text-sm">You have no active debts. That&apos;s great news!</p>
          </div>
        ) : (
          data.debts.map((d) => {
            const remaining = Number(d.amount);
            return (
              <div key={d.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#0F172A]">{d.name}</h3>
                    <p className="text-xs text-[#64748B]">Opened {formatDate(d.start_date)}</p>
                  </div>
                  <button
                    onClick={() => remove(d.id)}
                    title="Remove"
                    className="rounded-lg p-2 text-[#94A3B8] transition-all duration-200 hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="badge badge-red">Balance {formatMoney(remaining, sym)}</span>
                  <span className="badge badge-amber">Interest {Number(d.interest_rate)}%</span>
                  <span className="badge badge-slate">Min Payment {formatMoney(Number(d.minimum_payment), sym)}</span>
                </div>
                <div className="mt-4 flex max-w-md gap-2">
                  <input
                    className="input"
                    type="number"
                    min="0.01"
                    max={remaining}
                    step="10"
                    placeholder={`Payment amount (max ${formatMoney(remaining, sym)})`}
                    value={payments[d.id] ?? ""}
                    onChange={(e) => setPayments((prev) => ({ ...prev, [d.id]: e.target.value }))}
                  />
                  <button className="btn btn-primary shrink-0" onClick={() => makePayment(d)} disabled={busy}>
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Make Payment
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
