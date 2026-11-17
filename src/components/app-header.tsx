"use client";

import { Bell, CircleHelp } from "lucide-react";

export function AppHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#0F172A]">{title}</h1>
        <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="badge badge-green">
          <span className="pulse-dot h-2 w-2 rounded-full bg-green-500" />
          All systems live
        </span>
        <button
          title="Notifications"
          className="relative rounded-xl border border-[#E2E8F0] bg-white p-2.5 text-[#0F172A] transition-all duration-200 hover:bg-[#F8FAFC]"
        >
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#EF4444]" />
        </button>
        <button className="btn btn-dark">
          <CircleHelp size={18} />
          Help Center
        </button>
      </div>
    </header>
  );
}
