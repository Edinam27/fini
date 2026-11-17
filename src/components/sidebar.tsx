"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

/** Mobile top-nav fallback for small screens. */
export function MobileNav({ username }: { username: string }) {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-40 flex gap-1 overflow-x-auto border-b border-[#E2E8F0] bg-white px-3 py-2 lg:hidden">
      <span className="flex items-center gap-2 pr-3 font-heading text-sm font-bold text-[#EF4444]">
        <Landmark size={18} /> Freedom
      </span>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href}>
            <span
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                active ? "bg-[#F1F5F9] text-[#EF4444]" : "text-[#64748B]"
              }`}
            >
              <Icon size={14} />
              {label.split(" ")[0]}
            </span>
          </Link>
        );
      })}
      <span className="ml-auto self-center pr-1 text-xs font-semibold text-[#0F172A]">
        {username}
      </span>
    </div>
  );
}
