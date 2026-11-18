"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";

type Mode = "login" | "register" | "forgot";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push(json.data.onboarded ? "/dashboard" : "/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "request", username, email }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResetToken(json.data.token);
      setNotice("Reset token generated — it expires in 1 hour. Set a new password below.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset request failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetToken) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "confirm", token: resetToken, password: newPassword }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setNotice("Password updated — you can now sign in.");
      setMode("login");
      setResetToken(null);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white lg:grid-cols-2">
        {/* Brand panel */}
        <div className="hidden flex-col justify-between bg-[#0F172A] p-10 lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EF4444]">
              <Landmark size={20} className="text-white" />
            </span>
            <div>
              <p className="font-heading text-lg font-bold text-white">Freedom</p>
              <p className="text-xs text-slate-400">Financial Life Planner</p>
            </div>
          </div>
          <div>
            <h2 className="font-heading text-3xl font-bold leading-tight text-white">
              Every cedi, dollar and euro —<br />
              in one clear picture.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Track spending, plan budgets, grow investments, crush debt and
              reach your goals with live market prices.
            </p>
          </div>
          <div className="flex gap-8">
            {[
              ["Budgets", "Plan & track"],
              ["Investments", "Live prices"],
              ["Goals", "Stay on target"],
            ].map(([t, s]) => (
              <div key={t}>
                <p className="font-heading text-sm font-bold text-white">{t}</p>
                <p className="text-xs text-slate-400">{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10">
          <div className="mb-6 flex gap-2">
            <button
              className={`tab ${mode === "login" ? "active" : ""}`}
              onClick={() => { setMode("login"); setError(null); setNotice(null); }}
            >
              Sign In
            </button>
            <button
              className={`tab ${mode === "register" ? "active" : ""}`}
              onClick={() => { setMode("register"); setError(null); setNotice(null); }}
            >
              Register
            </button>
            <button
              className={`tab ${mode === "forgot" ? "active" : ""}`}
              onClick={() => { setMode("forgot"); setError(null); setNotice(null); }}
            >
              Forgot Password
            </button>
          </div>

          {error && (
            <div className="badge badge-red mb-4 w-full justify-start rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          {notice && (
            <div className="badge badge-green mb-4 w-full justify-start rounded-xl px-4 py-3">
              {notice}
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={submitLogin} className="space-y-4">
              <div>
                <label className="field-label" htmlFor="login-username">Username</label>
                <input
                  id="login-username"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="login-password">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    className="input pr-10"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                    title={showPassword ? "Hide" : "Show"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button className="btn btn-primary w-full" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                Sign In
              </button>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={submitRegister} className="space-y-4">
              <div>
                <label className="field-label" htmlFor="reg-username">Username</label>
                <input
                  id="reg-username"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  className="input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-[#64748B]">
                  At least 8 characters with lowercase, uppercase and a number.
                </p>
              </div>
              <button className="btn btn-primary w-full" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                Create Account
              </button>
            </form>
          )}

          {mode === "forgot" && !resetToken && (
            <form onSubmit={submitForgot} className="space-y-4">
              <p className="text-sm text-[#64748B]">
                Enter your username and registered email to generate a reset token.
              </p>
              <div>
                <label className="field-label" htmlFor="forgot-username">Username</label>
                <input
                  id="forgot-username"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="forgot-email">Registered Email</label>
                <input
                  id="forgot-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary w-full" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                <KeyRound size={16} />
                Request Reset
              </button>
            </form>
          )}

          {mode === "forgot" && resetToken && (
            <form onSubmit={submitNewPassword} className="space-y-4">
              <div>
                <label className="field-label" htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary w-full" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />}
                Set New Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
