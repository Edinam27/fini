"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  Wallet,
  User,
  PiggyBank,
  Target,
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  TrendingUp,
  ShieldCheck,
  Flame,
  Plus,
  Trash2,
} from "lucide-react";
import {
  CURRENCIES,
  CURRENCY_SYMBOLS,
  LIFE_STAGES,
  INCOME_SOURCES,
  EXPENSE_CATEGORIES,
  currencySymbol,
} from "@/lib/constants";
import { formatMoney } from "@/lib/format";

/** Recommended budget split (% of income) — leaves a 5% buffer. */
const RECOMMENDED_SPLIT: Record<string, number> = {
  Housing: 30,
  Food: 15,
  Transportation: 10,
  Utilities: 8,
  Insurance: 6,
  Entertainment: 6,
  Savings: 15,
  Others: 5,
};

const STEP_META = [
  { title: "Welcome", icon: Landmark, blurb: "Your money, one clear picture" },
  { title: "About you", icon: User, blurb: "Currency, life stage, risk style" },
  { title: "Income", icon: Wallet, blurb: "What comes in each month" },
  { title: "Budget", icon: PiggyBank, blurb: "Give every amount a job" },
  { title: "Goals", icon: Target, blurb: "What are you saving toward?" },
  { title: "Finish", icon: Sparkles, blurb: "Your dashboard is ready" },
] as const;

interface DraftGoal {
  name: string;
  target: string;
  deadline: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile
  const [currency, setCurrency] = useState("USD");
  const [lifeStage, setLifeStage] = useState<string>("starting-out");
  const [riskProfile, setRiskProfile] = useState("balanced");

  // Money
  const [income, setIncome] = useState<Record<string, number>>({});
  const [savings, setSavings] = useState("");
  const [budgets, setBudgets] = useState<Record<string, number>>({});

  // Goals
  const [goals, setGoals] = useState<DraftGoal[]>([]);
  const [seedSample, setSeedSample] = useState(true);

  const sym = currencySymbol(currency);
  const totalIncome = useMemo(
    () => Object.values(income).reduce((a, b) => a + b, 0),
    [income]
  );
  const totalBudget = useMemo(
    () => Object.values(budgets).reduce((a, b) => a + b, 0),
    [budgets]
  );

  function applyRecommendedSplit() {
    if (totalIncome <= 0) {
      setError("Add your monthly income first, then we can suggest a split.");
      return;
    }
    setError(null);
    setBudgets(
      Object.fromEntries(
        EXPENSE_CATEGORIES.map((c) => [
          c,
          Math.max(Math.round((totalIncome * (RECOMMENDED_SPLIT[c] ?? 0)) / 100 / 10) * 10, 0),
        ])
      )
    );
  }

  function addGoal() {
    if (goals.length >= 3) return;
    setGoals((prev) => [...prev, { name: "", target: "", deadline: "" }]);
  }

  function removeGoal(index: number) {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          lifeStage,
          riskProfile,
          savings: Number(savings || 0),
          income,
          budgets,
          goals: goals
            .filter((g) => g.name.trim() && Number(g.target) > 0)
            .map((g) => ({
              name: g.name.trim(),
              target_amount: Number(g.target),
              deadline: g.deadline || null,
            })),
          seedSample,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your setup");
      setBusy(false);
    }
  }

  async function skipEverything() {
    setBusy(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          lifeStage,
          riskProfile,
          savings: 0,
          income: {},
          budgets: {},
          goals: [],
          seedSample: false,
        }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  function next() {
    setError(null);
    setStep((s) => Math.min(s + 1, STEP_META.length - 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  const progress = (step / (STEP_META.length - 1)) * 100;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Left rail: brand + progress */}
      <aside className="hidden w-[340px] shrink-0 flex-col justify-between bg-[#0F172A] p-10 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EF4444]">
            <Landmark size={20} className="text-white" />
          </span>
          <div>
            <p className="font-heading text-lg font-bold text-white">Freedom</p>
            <p className="text-xs text-slate-400">Financial Life Planner</p>
          </div>
        </div>

        <nav className="space-y-1">
          {STEP_META.map(({ title, icon: Icon, blurb }, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <button
                key={title}
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 ${
                  active
                    ? "bg-white/10"
                    : done
                      ? "hover:bg-white/5"
                      : "opacity-40"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    done
                      ? "bg-green-500/20 text-green-400"
                      : active
                        ? "bg-[#EF4444] text-white"
                        : "bg-white/10 text-slate-400"
                  }`}
                >
                  {done ? <Check size={16} /> : <Icon size={16} />}
                </span>
                <span>
                  <span className={`block text-sm font-semibold ${active ? "text-white" : "text-slate-300"}`}>
                    {i + 1}. {title}
                  </span>
                  <span className="block text-xs text-slate-500">{blurb}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <p className="text-xs leading-relaxed text-slate-500">
          Takes about 2 minutes. Everything is optional and editable later in
          Settings.
        </p>
      </aside>

      {/* Right content */}
      <main className="flex flex-1 flex-col px-6 py-8 sm:px-12">
        {/* Mobile progress */}
        <div className="mb-8 lg:hidden">
          <p className="font-heading text-lg font-bold text-[#0F172A]">
            {STEP_META[step].title}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
            <div
              className="h-full rounded-full bg-[#EF4444] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          {/* Desktop header */}
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-[#EF4444]">
              Step {step + 1} of {STEP_META.length}
            </p>
            <h1 className="font-heading mt-1 text-3xl font-bold text-[#0F172A]">
              {step === 0 && "Welcome to Freedom 👋"}
              {step === 1 && "Tell us about you"}
              {step === 2 && "What comes in each month?"}
              {step === 3 && "Give every amount a job"}
              {step === 4 && "What are you saving toward?"}
              {step === 5 && "You're all set"}
            </h1>
            <p className="mt-2 text-sm text-[#64748B]">
              {step === 0 && "Two minutes now, a lifetime of clarity after."}
              {step === 1 && "This shapes your dashboard, currency and advice."}
              {step === 2 && "Add your monthly income sources — estimates are fine."}
              {step === 3 && "Set spending limits per category, or use our recommended split."}
              {step === 4 && "Optional — you can add goals any time."}
              {step === 5 && "One last choice, then we'll take you inside."}
            </p>
          </div>

          <div className="mt-8 flex-1">
            {error && (
              <div className="badge badge-red mb-5 w-full justify-start rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* STEP 0 — Welcome */}
            {step === 0 && (
              <div className="rise-in space-y-4">
                {[
                  {
                    icon: PiggyBank,
                    title: "Track every transaction",
                    body: "Log income and expenses in seconds — recurring ones too.",
                    color: "#EF4444",
                  },
                  {
                    icon: TrendingUp,
                    title: "Grow your investments",
                    body: "Stocks with live prices, treasury bills and bonds in one portfolio.",
                    color: "#3B82F6",
                  },
                  {
                    icon: Flame,
                    title: "Crush your debt",
                    body: "Make payments, watch balances fall, stay ahead of interest.",
                    color: "#F59E0B",
                  },
                ].map(({ icon: Icon, title, body, color }) => (
                  <div key={title} className="card flex items-center gap-4 p-5">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${color}1A` }}
                    >
                      <Icon size={20} style={{ color }} />
                    </span>
                    <div>
                      <p className="font-heading text-sm font-bold text-[#0F172A]">{title}</p>
                      <p className="text-sm text-[#64748B]">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 1 — About you */}
            {step === 1 && (
              <div className="rise-in space-y-8">
                <div>
                  <p className="field-label">Preferred currency</p>
                  <div className="grid grid-cols-5 gap-2">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        className={`rounded-xl border px-2 py-3 text-center transition-all duration-200 ${
                          currency === c
                            ? "border-[#EF4444] bg-[#FEF2F2]"
                            : "border-[#E2E8F0] bg-white hover:border-[#cbd5e1]"
                        }`}
                      >
                        <span className="font-heading block text-lg font-bold text-[#0F172A]">
                          {CURRENCY_SYMBOLS[c]}
                        </span>
                        <span className="text-xs text-[#64748B]">{c}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="field-label">Where are you in life?</p>
                  <div className="flex flex-wrap gap-2">
                    {LIFE_STAGES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setLifeStage(s)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition-all duration-200 ${
                          lifeStage === s
                            ? "border-[#EF4444] bg-[#FEF2F2] text-[#EF4444]"
                            : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#cbd5e1]"
                        }`}
                      >
                        {s.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="field-label">How do you like to invest?</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { key: "conservative", title: "Conservative", body: "Protect what I have. Slow and steady.", icon: ShieldCheck },
                      { key: "balanced", title: "Balanced", body: "Steady growth with measured risk.", icon: PiggyBank },
                      { key: "aggressive", title: "Aggressive", body: "Maximum growth — I can take the swings.", icon: Flame },
                    ].map(({ key, title, body, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRiskProfile(key)}
                        className={`card p-4 text-left transition-all duration-200 ${
                          riskProfile === key
                            ? "border-[#EF4444] ring-2 ring-[#EF4444]/20"
                            : "hover:border-[#cbd5e1]"
                        }`}
                      >
                        <Icon
                          size={20}
                          className={riskProfile === key ? "text-[#EF4444]" : "text-[#94A3B8]"}
                        />
                        <p className="font-heading mt-2 text-sm font-bold text-[#0F172A]">{title}</p>
                        <p className="mt-1 text-xs text-[#64748B]">{body}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — Income */}
            {step === 2 && (
              <div className="rise-in space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {INCOME_SOURCES.map((source) => (
                    <div key={source}>
                      <label className="field-label">{source}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">
                          {sym}
                        </span>
                        <input
                          className="input pl-8"
                          type="number"
                          min="0"
                          step="50"
                          placeholder="0"
                          value={income[source] ?? ""}
                          onChange={(e) =>
                            setIncome((prev) => ({ ...prev, [source]: Number(e.target.value) || 0 }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="field-label">Current savings (across all accounts)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">
                      {sym}
                    </span>
                    <input
                      className="input pl-8"
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                      value={savings}
                      onChange={(e) => setSavings(e.target.value)}
                    />
                  </div>
                </div>
                <div className="card bg-[#F8FAFC] p-4">
                  <p className="text-sm text-[#64748B]">Monthly income</p>
                  <p className="font-heading text-2xl font-bold text-[#0F172A]">
                    {formatMoney(totalIncome, sym)}
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3 — Budget */}
            {step === 3 && (
              <div className="rise-in space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[#64748B]">
                    {totalIncome > 0
                      ? `Allocating ${formatMoney(totalIncome, sym)} of monthly income`
                      : "Set limits per category — you can change these any time."}
                  </p>
                  <button type="button" className="btn btn-ghost" onClick={applyRecommendedSplit}>
                    <Sparkles size={16} className="text-[#EF4444]" />
                    Use recommended split
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {EXPENSE_CATEGORIES.map((category) => (
                    <div key={category}>
                      <label className="field-label">{category}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">
                          {sym}
                        </span>
                        <input
                          className="input pl-8"
                          type="number"
                          min="0"
                          step="10"
                          placeholder="0"
                          value={budgets[category] ?? ""}
                          onChange={(e) =>
                            setBudgets((prev) => ({ ...prev, [category]: Number(e.target.value) || 0 }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {totalIncome > 0 && (
                  <div
                    className={`card p-4 ${totalBudget > totalIncome ? "border-[#FECACA] bg-[#FEF2F2]" : "bg-[#F8FAFC]"}`}
                  >
                    <p className="text-sm text-[#64748B]">Unallocated</p>
                    <p
                      className={`font-heading text-2xl font-bold ${
                        totalBudget > totalIncome ? "text-[#EF4444]" : "text-[#0F172A]"
                      }`}
                    >
                      {formatMoney(totalIncome - totalBudget, sym)}
                    </p>
                    {totalBudget > totalIncome && (
                      <p className="mt-1 text-xs text-[#EF4444]">
                        Your budget exceeds your income — trim a category or two.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4 — Goals */}
            {step === 4 && (
              <div className="rise-in space-y-4">
                {goals.length === 0 && (
                  <div className="card border-dashed p-8 text-center">
                    <Target size={24} className="mx-auto mb-3 text-[#94A3B8]" />
                    <p className="text-sm text-[#64748B]">
                      An emergency fund, a home deposit, that trip — name it and
                      Freedom tracks the progress.
                    </p>
                  </div>
                )}
                {goals.map((g, i) => (
                  <div key={i} className="card grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
                    <div>
                      <label className="field-label">Goal name</label>
                      <input
                        className="input"
                        placeholder="e.g. Emergency fund"
                        value={g.name}
                        onChange={(e) =>
                          setGoals((prev) => prev.map((p, j) => (j === i ? { ...p, name: e.target.value } : p)))
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">Target ({sym})</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        step="100"
                        placeholder="5000"
                        value={g.target}
                        onChange={(e) =>
                          setGoals((prev) => prev.map((p, j) => (j === i ? { ...p, target: e.target.value } : p)))
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">Deadline</label>
                      <input
                        className="input"
                        type="date"
                        value={g.deadline}
                        onChange={(e) =>
                          setGoals((prev) => prev.map((p, j) => (j === i ? { ...p, deadline: e.target.value } : p)))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGoal(i)}
                      title="Remove goal"
                      className="mt-6 self-start rounded-lg p-2 text-[#94A3B8] transition-all duration-200 hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {goals.length < 3 && (
                  <button type="button" className="btn btn-ghost w-full" onClick={addGoal}>
                    <Plus size={16} />
                    Add a goal
                  </button>
                )}
              </div>
            )}

            {/* STEP 5 — Finish */}
            {step === 5 && (
              <div className="rise-in space-y-5">
                <div className="card space-y-3 p-6">
                  <p className="font-heading text-sm font-bold text-[#0F172A]">Your setup</p>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <dt className="text-[#64748B]">Currency</dt>
                    <dd className="text-right font-medium text-[#0F172A]">
                      {CURRENCY_SYMBOLS[currency]} {currency}
                    </dd>
                    <dt className="text-[#64748B]">Monthly income</dt>
                    <dd className="text-right font-medium text-[#0F172A]">
                      {formatMoney(totalIncome, sym)}
                    </dd>
                    <dt className="text-[#64748B]">Monthly budget</dt>
                    <dd className="text-right font-medium text-[#0F172A]">
                      {formatMoney(totalBudget, sym)}
                    </dd>
                    <dt className="text-[#64748B]">Goals</dt>
                    <dd className="text-right font-medium text-[#0F172A]">
                      {goals.filter((g) => g.name.trim() && Number(g.target) > 0).length || "None yet"}
                    </dd>
                  </dl>
                </div>

                <label className="card flex cursor-pointer items-center justify-between p-5 transition-all duration-200 hover:border-[#cbd5e1]">
                  <span>
                    <span className="font-heading block text-sm font-bold text-[#0F172A]">
                      Explore with sample data
                    </span>
                    <span className="text-xs text-[#64748B]">
                      Adds two months of example transactions and bills so your
                      dashboard has something to show. Delete them any time.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={seedSample}
                    onChange={(e) => setSeedSample(e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[#EF4444]"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="mt-10 flex items-center justify-between gap-3 pb-4">
            <div>
              {step > 0 && (
                <button className="btn btn-ghost" onClick={back} disabled={busy}>
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}
            </div>
            <button
              onClick={skipEverything}
              disabled={busy}
              className="text-sm font-medium text-[#94A3B8] transition-all duration-200 hover:text-[#64748B]"
            >
              Skip for now
            </button>
            {step < STEP_META.length - 1 ? (
              <button className="btn btn-primary min-w-32" onClick={next}>
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary min-w-44" onClick={finish} disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                Take me to my dashboard
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
