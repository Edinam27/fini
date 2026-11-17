"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, User, Bell, LifeBuoy, RotateCcw } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { apiGet, apiSend } from "@/lib/client";
import { CURRENCIES, LIFE_STAGES, RISK_PROFILES } from "@/lib/constants";

interface SettingsData {
  username: string;
  email: string;
  currency: string;
  lifeStage: string;
  riskProfile: string;
  savings: number;
  notifications: Record<string, boolean>;
  memberSince: string;
  lastLogin: string | null;
}

const NOTIFICATION_LABELS: Record<string, string> = {
  email: "Email notifications",
  push: "Push notifications",
  bill_reminders: "Bill reminders",
  budget_alerts: "Budget alerts",
  investment_alerts: "Investment alerts",
};

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<SettingsData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currency, setCurrency] = useState("USD");
  const [lifeStage, setLifeStage] = useState("starting-out");
  const [riskProfile, setRiskProfile] = useState("balanced");
  const [savings, setSavings] = useState("0");
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});

  async function load() {
    try {
      const d = await apiGet<SettingsData>("/api/settings");
      setData(d);
      setCurrency(d.currency);
      setLifeStage(d.lifeStage);
      setRiskProfile(d.riskProfile);
      setSavings(String(d.savings));
      setNotifications(d.notifications);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }

  useEffect(() => {
    let active = true;
    apiGet<SettingsData>("/api/settings")
      .then((d) => {
        if (!active) return;
        setData(d);
        setCurrency(d.currency);
        setLifeStage(d.lifeStage);
        setRiskProfile(d.riskProfile);
        setSavings(String(d.savings));
        setNotifications(d.notifications);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Load failed");
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiSend("/api/settings", "PUT", {
        currency,
        lifeStage,
        riskProfile,
        savings: Number(savings || 0),
        notifications,
      });
      setSuccess("Settings saved successfully!");
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppHeader title="Settings" subtitle="Preferences, profile and notification controls" />

      {error && <div className="badge badge-red mb-4 w-full justify-start rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="badge badge-green mb-4 w-full justify-start rounded-xl px-4 py-3">{success}</div>}

      <form onSubmit={save} className="grid gap-6 xl:grid-cols-2">
        {/* Profile */}
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-heading text-base font-bold text-[#0F172A]">
            <User size={18} className="text-[#EF4444]" />
            Profile
          </h3>
          {data ? (
            <div className="mb-6 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F1F5F9] font-heading text-lg font-bold text-[#EF4444]">
                {data.username.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="font-semibold text-[#0F172A]">{data.username}</p>
                <p className="text-sm text-[#64748B]">{data.email}</p>
                <p className="text-xs text-[#94A3B8]">Member since {data.memberSince?.slice(0, 10)}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Life Stage</label>
              <select className="input" value={lifeStage} onChange={(e) => setLifeStage(e.target.value)}>
                {LIFE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("-", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Risk Profile</label>
              <select className="input" value={riskProfile} onChange={(e) => setRiskProfile(e.target.value)}>
                {RISK_PROFILES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Total Savings</label>
              <input className="input" type="number" min="0" step="100" value={savings} onChange={(e) => setSavings(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-heading text-base font-bold text-[#0F172A]">
            <LifeBuoy size={18} className="text-[#EF4444]" />
            Preferences
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Display Currency</label>
              <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Historical amounts stay as recorded — the symbol updates across the app.
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-heading text-base font-bold text-[#0F172A]">
            <Bell size={18} className="text-[#EF4444]" />
            Notifications
          </h3>
          <div className="space-y-3">
            {Object.keys(NOTIFICATION_LABELS).map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-[#F8FAFC]"
              >
                <span className="text-sm text-[#0F172A]">{NOTIFICATION_LABELS[key]}</span>
                <input
                  type="checkbox"
                  checked={notifications[key] ?? false}
                  onChange={(e) => setNotifications((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="h-4 w-4 accent-[#EF4444]"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Save + onboarding restart */}
        <div className="card flex flex-wrap items-center justify-between gap-4 p-6 xl:col-span-2">
          <p className="text-sm text-[#64748B]">
            Changes apply across every page the next time you load data.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy || !data}
              onClick={async () => {
                setBusy(true);
                try {
                  await apiSend("/api/onboarding", "DELETE");
                  router.push("/onboarding");
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not restart onboarding");
                  setBusy(false);
                }
              }}
            >
              <RotateCcw size={16} />
              Re-run Welcome Wizard
            </button>
            <button className="btn btn-primary" disabled={busy || !data}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Settings
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
