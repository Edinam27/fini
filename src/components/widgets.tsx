"use client";

import Link from "next/link";
import { Star, ArrowUpRight } from "lucide-react";

/** Theme-spec high-attention dark card (#0F172A) with transparent-white button. */
export function DarkActionCard({
  title,
  body,
  cta,
  href,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl bg-[#0F172A] p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-base font-bold text-white">{title}</h3>
        <span className="badge border border-green-500/30 bg-green-500/10 text-green-400">
          <span className="pulse-dot h-2 w-2 rounded-full bg-green-500" />
          Active
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white hover:text-[#0F172A]"
      >
        {cta}
        <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}

/** 5-star review widget, 12px italic Satoshi text per theme spec. */
export function ReviewCard() {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-bold text-[#0F172A]">Member Spotlight</h3>
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs italic leading-relaxed text-[#64748B]">
        “Freedom finally made my money make sense. The budget alerts caught my
        overspending before it became a problem, and the debt tracker is the
        reason I finished paying off my car loan early.”
      </p>
      <p className="mt-3 text-xs font-semibold text-[#0F172A]">
        Ama K. <span className="font-normal text-[#64748B]">— member since 2024</span>
      </p>
    </div>
  );
}

/** Vertical status list with circular icons per theme spec. */
export function AccountStatusCard({
  items,
}: {
  items: Array<{ label: string; sub: string; state: "ok" | "warn" | "info" }>;
}) {
  const stateStyles: Record<string, { bg: string; dot: string }> = {
    ok: { bg: "#F0FDF4", dot: "#22C55E" },
    warn: { bg: "#FFFBEB", dot: "#F59E0B" },
    info: { bg: "#EFF6FF", dot: "#3B82F6" },
  };
  return (
    <div className="card p-6">
      <h3 className="font-heading text-sm font-bold text-[#0F172A]">Account Status</h3>
      <div className="mt-4 space-y-4">
        {items.map((item) => {
          const s = stateStyles[item.state];
          return (
            <div key={item.label} className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: s.bg }}
              >
                <span
                  className={`h-2 w-2 rounded-full ${item.state === "ok" ? "pulse-dot" : ""}`}
                  style={{ background: s.dot }}
                />
              </span>
              <div>
                <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
                <p className="text-xs text-[#64748B]">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Section shell with a "View All" link, per theme's Live Orders pattern. */
export function SectionCard({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="font-heading text-base font-bold text-[#0F172A]">{title}</h3>
        {viewAllHref && (
          <a
            href={viewAllHref}
            className="text-sm font-medium text-[#EF4444] transition-all duration-200 hover:text-[#dc2626]"
          >
            View All
          </a>
        )}
      </div>
      <div className="border-t border-[#E2E8F0]">{children}</div>
    </div>
  );
}
