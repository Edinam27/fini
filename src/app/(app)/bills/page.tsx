"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, CalendarClock, Check, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { StatCard } from "@/components/stat-card";
import { apiGet, apiSend } from "@/lib/client";
import { BILL_FREQUENCIES, EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatMoney, formatDate, todayISO } from "@/lib/format";
import { useCurrencySymbol } from "@/lib/use-currency";

interface Bill {
  id: number;
  name: string;
  amount: string;
  due_date: string;
  frequency: string;
  category: string | null;
  auto_pay: boolean;
  reminder_days: number;
  paid: boolean;
  /** Enriched at fetch time so render stays pure. */
  dueInDays: number | null;
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [dueThisWeek, setDueThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [frequency, setFrequency] = useState<string>("Monthly");
  const [category, setCategory] = useState<string>("Utilities");
  const [autoPay, setAutoPay] = useState(false);
  const [reminderDays, setReminderDays] = useState("3");

  function enrich(raw: Bill[]): Bill[] {
    return raw.map((b) => ({
      ...b,
      dueInDays: Math.ceil((new Date(`${b.due_date}T00:00:00`).getTime() - Date.now()) / 86_400_000),
    }));
  }

  async function load() {
    setLoading(true);
    try {
      const raw = await apiGet<Bill[]>("/api/bills?days=90");
      const enriched = enrich(raw);
      setBills(enriched);
      setDueThisWeek(
        enriched.filter((b) => !b.paid && b.dueInDays !== null && b.dueInDays <= 7).length
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiGet<Bill[]>("/api/bills?days=90")
      .then((raw) => {
        if (!active) return;
        const enriched = enrich(raw);
        setBills(enriched);
        setDueThisWeek(
          enriched.filter((b) => !b.paid && b.dueInDays !== null && b.dueInDays <= 7).length
        );
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

  async function addBill(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/bills", "POST", {
        name: name.trim(),
        amount: Number(amount),
        due_date: dueDate,
        frequency,
        category,
        auto_pay: autoPay,
        reminder_days: Number(reminderDays || 0),
      });
      setSuccess("Bill added successfully!");
      setName("");
      setAmount("");
      setShowForm(false);
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function payBill(id: number) {
    setBusy(true);
    try {
      await apiSend("/api/bills", "PATCH", { id });
      setSuccess("Bill marked as paid — recorded as an expense.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await apiSend(`/api/bills?id=${id}`, "DELETE");
      setBills((prev) => prev.filter((b) => b.id !== id));
      setSuccess("Bill removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const sym = useCurrencySymbol();
  const totalUpcoming = bills.filter((b) => !b.paid).reduce((a, b) => a + Number(b.amount), 0);

  return (
    <>
      <AppHeader
        title="Bills & Subscriptions"
        subtitle="Never miss a due date — reminders and autopay tracking"
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={18} />
          {showForm ? "Close" : "Add New Bill"}
        </button>
      </div>

      {error && <div className="badge badge-red mb-4 w-full justify-start rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="badge badge-green mb-4 w-full justify-start rounded-xl px-4 py-3">{success}</div>}

      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Upcoming (90 days)" value={totalUpcoming} icon={CalendarClock} color="#F59E0B" currencySymbol={sym} />
        <StatCard label="Due This Week" value={String(dueThisWeek)} icon={CalendarClock} color="#EF4444" />
        <StatCard label="Tracked Bills" value={String(bills.length)} icon={Check} color="#3B82F6" />
      </div>

      {showForm && (
        <form onSubmit={addBill} className="card mt-6 grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="field-label">Bill Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Amount</label>
            <input className="input" type="number" min="0.01" step="10" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Due Date</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Frequency</label>
            <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {BILL_FREQUENCIES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Reminder (days before)</label>
            <input className="input" type="number" min="0" max="30" value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 self-end text-sm text-[#0F172A]">
            <input type="checkbox" checked={autoPay} onChange={(e) => setAutoPay(e.target.checked)} className="h-4 w-4 accent-[#EF4444]" />
            Auto-pay enabled
          </label>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              Add Bill
            </button>
          </div>
        </form>
      )}

      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="font-heading text-base font-bold text-[#0F172A]">Upcoming Bills</h3>
          <span className="text-sm text-[#64748B]">sorted by due date</span>
        </div>
        <div className="border-t border-[#E2E8F0]">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={20} className="animate-spin text-[#64748B]" />
            </div>
          ) : bills.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#64748B]">
              No upcoming bills in the next 90 days.
            </p>
          ) : (
            bills.map((b) => {
              const dueIn = b.dueInDays;
              const urgent = !b.paid && dueIn !== null && dueIn <= 3;
              return (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center gap-4 px-6 py-4 transition-all duration-200 hover:bg-[#F8FAFC] not-last:border-b not-last:border-[#E2E8F0]"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: b.paid ? "#F0FDF4" : "#FFF7ED" }}
                  >
                    <CalendarClock size={18} style={{ color: b.paid ? "#10B981" : "#F59E0B" }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#0F172A]">
                      {b.name}
                      {b.auto_pay && <span className="badge badge-blue ml-2">Auto-pay</span>}
                      {b.paid && <span className="badge badge-green ml-2">Paid</span>}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      {b.frequency} · {b.category ?? "Uncategorized"} · reminder {b.reminder_days}d before
                    </p>
                  </div>
                  <span className={`badge ${urgent ? "badge-red" : "badge-slate"}`}>
                    Due {formatDate(b.due_date)}
                    {!b.paid && dueIn !== null && dueIn >= 0 ? ` · in ${dueIn}d` : ""}
                  </span>
                  <span className="w-24 text-right font-heading text-sm font-bold text-[#0F172A]">
                    {formatMoney(Number(b.amount), sym)}
                  </span>
                  {!b.paid && (
                    <button
                      onClick={() => payBill(b.id)}
                      title="Mark paid"
                      className="rounded-lg p-2 text-[#10B981] transition-all duration-200 hover:bg-[#F0FDF4]"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => remove(b.id)}
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
