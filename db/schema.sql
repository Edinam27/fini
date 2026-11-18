-- ============================================================
-- Financial Life Planner 2.0 — Neon PostgreSQL Schema
-- ============================================================

-- 1. USERS ----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                 SERIAL PRIMARY KEY,
  username           TEXT NOT NULL UNIQUE,
  email              TEXT NOT NULL UNIQUE,
  password_hash      TEXT NOT NULL,
  life_stage         TEXT DEFAULT 'starting-out',
  income             NUMERIC(14, 2) DEFAULT 0,
  savings            NUMERIC(14, 2) DEFAULT 0,
  risk_profile       TEXT DEFAULT 'balanced',
  currency           TEXT NOT NULL DEFAULT 'USD',
  goals              JSONB DEFAULT '[]',
  expenses           JSONB DEFAULT '{}',
  notifications      JSONB DEFAULT '{"email": true, "push": false, "bill_reminders": true, "budget_alerts": true, "investment_alerts": true}',
  settings           JSONB DEFAULT '{}',
  reset_token        TEXT,
  reset_token_expiry TIMESTAMPTZ,
  created_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login         TIMESTAMPTZ
);

-- 2. TRANSACTIONS ---------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Income', 'Expense')),
  category         TEXT NOT NULL,
  subcategory      TEXT,
  name             TEXT,
  description      TEXT,
  amount           NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  interest_rate    NUMERIC(5, 2),
  minimum_payment  NUMERIC(14, 2),
  payment_method   TEXT,
  recurring        BOOLEAN DEFAULT FALSE,
  tags             TEXT,
  related_debt_id  INTEGER REFERENCES transactions(id),
  date             DATE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date     ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type     ON transactions(user_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);

-- 3. PORTFOLIOS (investments) ---------------------------------
CREATE TABLE IF NOT EXISTS portfolios (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol         TEXT NOT NULL,
  quantity       NUMERIC(14, 4) NOT NULL CHECK (quantity >= 0),
  purchase_price NUMERIC(14, 4) NOT NULL CHECK (purchase_price >= 0),
  purchase_date  DATE NOT NULL,
  portfolio_type TEXT NOT NULL CHECK (portfolio_type IN ('stock', 'company_share', 'treasury_bill', 'bond')),
  currency       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Existing deployments: add the per-holding currency column idempotently.
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS currency TEXT;

CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);

-- 4. BILLS -----------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  amount        NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  due_date      DATE NOT NULL,
  frequency     TEXT NOT NULL DEFAULT 'Monthly' CHECK (frequency IN ('Weekly', 'Monthly', 'Yearly')),
  category      TEXT,
  auto_pay      BOOLEAN DEFAULT FALSE,
  reminder_days INTEGER DEFAULT 0,
  paid          BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_user_due ON bills(user_id, due_date);

-- 5. BUDGETS (per-category monthly budget) --------------------
CREATE TABLE IF NOT EXISTS budgets (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category  TEXT NOT NULL,
  amount    NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  month     TEXT NOT NULL, -- 'YYYY-MM' format; empty string = recurring default
  UNIQUE (user_id, category, month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);

-- 6. REPORTS ---------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('monthly', 'quarterly', 'annual')),
  report_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);

-- 7. GOALS (dedicated table — cleaner than JSONB for tracking) -
CREATE TABLE IF NOT EXISTS goals (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  target_amount  NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deadline       DATE,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_date   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

-- 8. SESSIONS (server-side session store) ---------------------
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 9. ONBOARDING TRACKING -------------------------------------
-- NULL until the user completes (or skips) the welcome wizard.
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
