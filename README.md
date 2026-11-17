# Freedom — Financial Life Planner 2.0

A modern Next.js (App Router) rewrite of the original Streamlit
[fin_planner-2.0](https://github.com/Edinam27/fin_planner-2.0) app, backed by
Neon PostgreSQL and styled with the **Corporate Modern** design system
(White / Slate / Red-500, General Sans + Satoshi).

## Features (full parity with the original app)

| Original (Streamlit) | This app (Next.js) |
| --- | --- |
| — | **Guided onboarding wizard** for new sign-ups: Welcome → About You (currency / life stage / risk style) → Income → Budget (one-click recommended split) → Goals → Finish, with optional sample-data seeding and a "Skip for now" path. Re-runnable from Settings. |
| Login / Register / Forgot password (SHA-256, session timeout) | bcrypt hashing, server-side sessions, 30-min sliding idle timeout, reset tokens (1-hour expiry) |
| Dashboard: net worth, portfolio value, upcoming bills, monthly savings | Same metrics in a 4-card stats grid + budget alerts |
| Spending trend, income-vs-expense trend, spending pie | Recharts line/area/donut charts with brand palette |
| Recent transactions list | Recent transactions list with income/expense coloring |
| Transactions: add (type, category, subcategory, payment method, recurring, tags), filter by type/category, sort, delete | Full CRUD with identical fields, filters and sorting |
| Budget Planner: 4 income sources, 8 expense categories, save | Same planner; budgets persist in a `budgets` table + settings JSONB |
| Budget Tracking: progress bars per category, alerts at 80% | Same tracking with green/amber/red progress and threshold alerts |
| Goals: add (name, amount, deadline), delete, JSONB storage | Dedicated `goals` table + per-goal contributions, on-track calculation |
| Investments: Stocks (live yfinance price), Company Shares, Treasury Bills, Bonds; return / risk / Sharpe | Stocks via live Yahoo Finance quotes; identical asset types; return, risk (std dev), Sharpe ratio (2% risk-free) |
| Debt Management: add debt, payment reduces balance + records linked payment, analysis | Same behavior, stored in `transactions` with `category='debt'` exactly like the original |
| Bills & Subscriptions: add bill (frequency, reminder days), upcoming list | Same, plus "mark paid" which writes an expense transaction |
| Reports: monthly report generation, recommendations, CSV/Excel export | Monthly/quarterly/annual reports, rule-based recommendations, CSV export |
| Settings: currency (USD/EUR/GBP/JPY/GHS), theme, notifications | Same currency options; savings, life stage, risk profile, notification toggles. Currency change updates the symbol (historical amounts are no longer destructively rewritten) |

## Tech Stack

- **Next.js 16** (App Router, Turbopack, Cache Components) + React 19
- **Tailwind CSS v4** with the theme tokens from `theme.md`
- **Neon PostgreSQL** via `pg` (serverless-friendly pooling)
- **bcryptjs** password hashing, DB-backed httpOnly cookie sessions
- **Zod** validation on every API boundary
- **Recharts** + custom CSS bar charts, **lucide-react** icons

## Getting Started

```bash
npm install
```

1. Put your Neon connection string in `.env`:

   ```
   DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
   AUTH_SECRET=<any long random string>
   ```

2. Create the schema in Neon:

   ```bash
   npm run migrate
   ```

3. Run it:

   ```bash
   npm run dev
   ```

Open http://localhost:3000, register an account, and start tracking.

## Database Schema (Neon)

`db/schema.sql` — applied by `npm run migrate`:

- **users** — account, profile (life stage, risk profile, savings), currency,
  notifications, settings JSONB, reset tokens, `onboarded_at` (gates the
  welcome wizard)
- **transactions** — Income/Expense records with category, subcategory,
  payment method, recurring flag, tags; debts stored here as
  `category='debt'` with `interest_rate`/`minimum_payment`; debt payments as
  linked `debt_payment` rows (`related_debt_id`)
- **portfolios** — stocks / company shares / treasury bills / bonds
- **bills** — frequency, due date, reminder days, autopay, paid flag
- **budgets** — per-category recurring budgets (unique per user + category)
- **goals** — target, current amount, deadline, status
- **reports** — generated monthly/quarterly/annual snapshots (JSONB)
- **sessions** — server-side session store (30-min idle, 7-day max age)

Indexes on user+date, user+type, user+category keep dashboard aggregates fast.

## Project Layout

```
src/
├── app/
│   ├── (app)/            # Authenticated shell (sidebar layout)
│   │   ├── dashboard/    transactions/ budget/ goals/
│   │   ├── investments/  debts/ bills/ reports/ settings/
│   ├── login/            # Sign in / register / forgot password
│   └── api/              # auth, transactions, budget, goals, investments,
│                         # debts, bills, dashboard, reports, settings, export
├── components/           # sidebar, header, stat cards, charts, widgets
├── lib/                  # db, auth, api envelope, constants, formatting
└── proxy.ts              # route protection (Next 16 proxy convention)
db/schema.sql             # Neon schema
scripts/migrate.mjs       # schema applier
```

## Design System (theme.md)

- Background `#F8FAFC`, sidebar white, text `#0F172A`, brand `#EF4444`
- 1px `#E2E8F0` borders (no heavy shadows), 16px card / 12px control radii
- General Sans headings, Satoshi body (Fontshare), Lucide 20px icons
- Status pulse badges, dark `#0F172A` action card, rounded-top CSS bar chart
- 6px scrollbars, `cubic-bezier(0.4, 0, 0.2, 1)` hover transitions
