"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Target, CalendarClock, CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { apiGet, apiSend } from "@/lib/client";
import { formatMoney, formatDate, todayISO } from "@/lib/format";
import { useCurrencySymbol } from "@/lib/use-currency";

interface Goal {
  id: number;
  name: string;
  target_amount: string;
  current_amount: string;
  deadline: string | null;
  percentage: number;
  daysRemaining: number | null;
  onTrack: boolean;
  remainingAmount: number;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [contributions, setContributions] = useState<Record<number, string>>({});

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  async function load() {
    setLoading(true);
    try {
      setGoals(await apiGet<Goal[]>("/api/goals"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiGet<Goal[]>("/api/goals")
      .then((g) => {
        if (!active) return;
        setGoals(g);
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

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || Number(targetAmount) <= 0) {
      setError("Please enter a goal name and amount greater than 0.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/goals", "POST", {
        name: name.trim(),
        target_amount: Number(targetAmount),
        deadline: deadline || null,
      });
      setSuccess("Goal added successfully!");
      setName("");
      setTargetAmount("");
      setDeadline("");
      setShowForm(false);
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function contribute(goal: Goal) {
    const amount = Number(contributions[goal.id] ?? 0);
    if (amount <= 0) {
      setError("Enter a contribution amount.");
      return;
    }
    setBusy(true);
    try {
      await apiSend("/api/goals", "PATCH", { id: goal.id, amount });
      setSuccess(`Added ${formatMoney(amount, sym)} to "${goal.name}".`);
      setContributions((prev) => ({ ...prev, [goal.id]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Contribution failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await apiSend(`/api/goals?id=${id}`, "DELETE");
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setSuccess("Goal removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const sym = useCurrencySymbol();

  return (
    <>
      <AppHeader
        title="Financial Goals"
        subtitle="Set targets, contribute monthly, watch progress climb"
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={18} />
          {showForm ? "Close" : "Add New Goal"}
        </button>
        <span className="badge badge-slate self-center">
          {goals.length} active goal{goals.length === 1 ? "" : "s"}
        </span>
      </div>

      {error && <div className="badge badge-red mb-4 w-full justify-start rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="badge badge-green mb-4 w-full justify-start rounded-xl px-4 py-3">{success}</div>}

      {showForm && (
        <form onSubmit={addGoal} className="card mb-6 grid gap-4 p-6 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="field-label">Goal Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Target Amount</label>
            <input
              className="input"
              type="number"
              min="1"
              step="100"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label">Target Date</label>
            <input className="input" type="date" min={todayISO()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="sm:col-span-4">
            <button className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" />}
              Add Goal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={22} className="animate-spin text-[#64748B]" />
        </div>
      ) : goals.length === 0 ? (
        <div className="card flex flex-col items-center py-20 text-[#64748B]">
          <Target size={28} className="mb-3" />
          <p className="text-sm">No goals yet — add your first one above.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => {
            const done = g.percentage >= 100;
            return (
              <div key={g.id} className="card p-6">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#0F172A]">{g.name}</h3>
                    <p className="text-xs text-[#64748B]">
                      {formatMoney(Number(g.current_amount), sym)} of{" "}
                      {formatMoney(Number(g.target_amount), sym)}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(g.id)}
                    title="Remove"
                    className="rounded-lg p-2 text-[#94A3B8] transition-all duration-200 hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      done ? "bg-green-500" : "bg-[#EF4444]"
                    }`}
                    style={{ width: `${g.percentage}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className={done ? "text-green-600" : "text-[#64748B]"}>
                    {done ? "Completed" : `${g.percentage.toFixed(1)}% there`}
                  </span>
                  {g.deadline && (
                    <span className={`badge ${g.onTrack ? "badge-green" : "badge-amber"}`}>
                      <CalendarClock size={12} />
                      {g.daysRemaining !== null && g.daysRemaining >= 0
                        ? `${g.daysRemaining} days left`
                        : "Past deadline"}
                      {!g.onTrack && !done && " · off track"}
                    </span>
                  )}
                  {done && <CheckCircle2 size={16} className="text-green-500" />}
                </div>

                {!done && (
                  <div className="mt-4 flex gap-2">
                    <input
                      className="input"
                      type="number"
                      min="0.01"
                      step="10"
                      placeholder={`Contribute (${sym})`}
                      value={contributions[g.id] ?? ""}
                      onChange={(e) =>
                        setContributions((prev) => ({ ...prev, [g.id]: e.target.value }))
                      }
                    />
                    <button className="btn btn-primary shrink-0" onClick={() => contribute(g)} disabled={busy}>
                      Add
                    </button>
                  </div>
                )}

                {g.deadline && (
                  <p className="mt-2 text-xs text-[#94A3B8]">
                    Deadline {formatDate(g.deadline)} · {formatMoney(g.remainingAmount, sym)} to go
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
