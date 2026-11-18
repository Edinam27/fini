import { ok, serverError, requireUser, num } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { fetchStockPrice } from "@/lib/stocks";

/**
 * GET /api/dashboard — one aggregate payload for the dashboard:
 * net worth (assets − liabilities), portfolio value/return, upcoming bills,
 * monthly savings, budget alerts, chart series and recent transactions.
 */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const month = new Date().toISOString().slice(0, 7);

    const [monthTotals, portfolio, upcomingBills, settingsRow, spendingSeries, trendSeries, recent, categoryTotals, alertRows] =
      await Promise.all([
        queryOne<{ income: string; expenses: string }>(
          `SELECT
             COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'Income'), 0) AS income,
             COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'Expense'), 0) AS expenses
           FROM transactions
          WHERE user_id = $1 AND to_char(date, 'YYYY-MM') = $2`,
          [user.id, month]
        ),
        query<{ symbol: string; quantity: string; purchase_price: string; portfolio_type: string; currency: string | null }>(
          "SELECT symbol, quantity, purchase_price, portfolio_type, currency FROM portfolios WHERE user_id = $1",
          [user.id]
        ),
        query<{ total: string }>(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM bills
            WHERE user_id = $1 AND paid = FALSE
              AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '7 days'`,
          [user.id]
        ),
        queryOne<{ settings: { currency?: string } | null; currency: string | null }>(
          "SELECT settings, currency FROM users WHERE id = $1",
          [user.id]
        ),
        query<{ day: string; category: string; amount: string }>(
          `SELECT to_char(date, 'YYYY-MM-DD') AS day, category, SUM(amount) AS amount
             FROM transactions
            WHERE user_id = $1 AND transaction_type = 'Expense'
              AND date >= CURRENT_DATE - interval '30 days'
              AND category IS NOT NULL AND category <> ''
            GROUP BY day, category
            ORDER BY day`,
          [user.id]
        ),
        query<{ day: string; income: string; expenses: string }>(
          `SELECT to_char(date, 'YYYY-MM-DD') AS day,
                  COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'Income'), 0) AS income,
                  COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'Expense'), 0) AS expenses
             FROM transactions
            WHERE user_id = $1 AND date >= CURRENT_DATE - interval '90 days'
            GROUP BY day ORDER BY day`,
          [user.id]
        ),
        query(
          `SELECT id, to_char(date, 'YYYY-MM-DD') AS date, category,
                  subcategory, transaction_type, amount, description, payment_method
             FROM transactions WHERE user_id = $1
            ORDER BY date DESC, id DESC LIMIT 10`,
          [user.id]
        ),
        query<{ category: string; amount: string }>(
          `SELECT category, SUM(amount) AS amount
             FROM transactions
            WHERE user_id = $1 AND transaction_type = 'Expense'
              AND date >= CURRENT_DATE - interval '30 days'
            GROUP BY category ORDER BY amount DESC`,
          [user.id]
        ),
        query<{ category: string; spent: string }>(
          `SELECT category, SUM(amount) AS spent
             FROM transactions
            WHERE user_id = $1 AND transaction_type = 'Expense'
              AND to_char(date, 'YYYY-MM') = $2
            GROUP BY category`,
          [user.id, month]
        ),
      ]);

    // Portfolio value with live stock prices (falls back to cost basis).
    // Only holdings in the account currency fold into the totals — foreign-
    // currency holdings are surfaced as an alert instead of being summed.
    const accountCurrency = settingsRow?.currency ?? settingsRow?.settings?.currency ?? "USD";
    const foreignByCurrency = new Map<string, number>();
    const stockSymbols = [
      ...new Set(portfolio.filter((p) => p.portfolio_type === "stock").map((p) => p.symbol)),
    ];
    const prices = new Map<string, number | null>();
    await Promise.all(
      stockSymbols.map(async (s) => prices.set(s, await fetchStockPrice(s)))
    );
    let portfolioValue = 0;
    let portfolioCost = 0;
    for (const p of portfolio) {
      const holdingValue =
        num(p.quantity) *
        (p.portfolio_type === "stock" ? prices.get(p.symbol) ?? num(p.purchase_price) : num(p.purchase_price));
      const holdingCost = num(p.quantity) * num(p.purchase_price);
      const holdingCurrency = p.currency ?? accountCurrency;
      if (holdingCurrency === accountCurrency) {
        portfolioValue += holdingValue;
        portfolioCost += holdingCost;
      } else {
        foreignByCurrency.set(
          holdingCurrency,
          (foreignByCurrency.get(holdingCurrency) ?? 0) + holdingValue
        );
      }
    }
    const portfolioReturn = portfolioCost > 0 ? (portfolioValue - portfolioCost) / portfolioCost : 0;

    const income30 = num(monthTotals?.income);
    const expenses30 = num(monthTotals?.expenses);

    // Net worth: last-30-day income + investments − last-30-day expenses (same
    // calculation as the original analyzer).
    const totalAssets = income30 + portfolioValue;
    const totalLiabilities = expenses30;
    const netWorth = totalAssets - totalLiabilities;

    // Budget alerts from user's saved budget.
    const settings = settingsRow?.settings ?? {};
    const budget = (settings as Record<string, unknown>).budget as
      | Record<string, number>
      | undefined;
    const alerts: string[] = [];
    for (const [code, value] of foreignByCurrency) {
      alerts.push(
        `Info: ${code} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} in investments is held outside your display currency — see the Investments page.`
      );
    }
    for (const row of alertRows) {
      const budgetAmount = budget?.[row.category];
      if (typeof budgetAmount === "number" && budgetAmount > 0 && num(row.spent) > budgetAmount * 0.8) {
        alerts.push(
          `Warning: ${row.category} spending at ${((num(row.spent) / budgetAmount) * 100).toFixed(1)}% of budget`
        );
      }
    }

    return ok({
      currency: accountCurrency,
      netWorth,
      totalAssets,
      totalLiabilities,
      portfolioValue,
      portfolioReturn,
      upcomingBillsTotal: num(upcomingBills[0]?.total),
      monthlyIncome: income30,
      monthlyExpenses: expenses30,
      monthlySavings: income30 - expenses30,
      alerts,
      spendingSeries,
      trendSeries,
      categoryTotals,
      recentTransactions: recent,
    });
  } catch (err) {
    return serverError("dashboard", err);
  }
}
