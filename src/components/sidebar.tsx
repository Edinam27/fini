"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Target,
  TrendingUp,
  CreditCard,
  CalendarClock,
  FileBarChart,
  Settings,
  LogOut,
  Landmark,
  Menu,
  X,
} from "lucide-react";

interface NavEntry {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

const NAV: NavEntry[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/debts", label: "Debt Management", icon: CreditCard },
  { href: "/bills", label: "Bills & Subscriptions", icon: CalendarClock },
  { href: "/reports", label: "Reports & Analysis", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  username,
  email,
}: {
  username: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = username.slice(0, 2).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#E2E8F0] bg-white max-lg:hidden">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EF4444]">
          <Landmark size={20} className="text-white" />
        </span>
        <div>
          <p className="font-heading text-base font-bold text-[#0F172A]">Freedom</p>
          <p className="text-xs text-[#64748B]">Financial Life Planner</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
              <Icon size={20} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile card */}
      <div className="border-t border-[#E2E8F0] p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9] font-heading text-sm font-bold text-[#EF4444]">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#0F172A]">{username}</p>
            <p className="truncate text-xs text-[#64748B]">{email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-lg p-2 text-[#64748B] transition-all duration-200 hover:bg-[#F1F5F9] hover:text-[#EF4444]"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * Mobile shell: a sticky top bar with a hamburger button plus a slide-in
 * navigation drawer (full labels, active states, profile + sign out).
 */
export function MobileNav({
  username,
  email,
}: {
  username: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Focus the drawer when it opens so Escape and screen readers land inside it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // Escape closes; lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const initials = username.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          title="Open menu"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-[#0F172A] transition-colors duration-200 hover:bg-[#F1F5F9]"
        >
          <Menu size={22} />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EF4444]">
            <Landmark size={16} className="text-white" />
          </span>
          <span className="font-heading text-sm font-bold text-[#EF4444]">Freedom</span>
        </Link>
        <span className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] font-heading text-xs font-bold text-[#EF4444]">
          {initials}
        </span>
      </div>

      {/* Drawer backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        id="mobile-nav-drawer"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        inert={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-[#E2E8F0] bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EF4444]">
              <Landmark size={20} className="text-white" />
            </span>
            <div>
              <p className="font-heading text-base font-bold text-[#0F172A]">Freedom</p>
              <p className="text-xs text-[#64748B]">Financial Life Planner</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            title="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] transition-colors duration-200 hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`nav-item min-h-[44px] ${active ? "active" : ""}`}
              >
                <Icon size={20} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile + sign out */}
        <div className="border-t border-[#E2E8F0] p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9] font-heading text-sm font-bold text-[#EF4444]">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#0F172A]">{username}</p>
              <p className="truncate text-xs text-[#64748B]">{email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-ghost w-full min-h-[44px]"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
