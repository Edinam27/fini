import { z } from "zod";
import { ok, serverError, requireUser, num } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { fetchStockPrice } from "@/lib/stocks";

/**
 * GET  /api/reports — list saved reports.
 * POST /api/reports — generate a monthly/quarterly/annual report and save it.
 */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const reports = await query(
      `SELECT id, report_type, report_date, report_data
         FROM reports WHERE user_id = $1
        ORDER BY report_date DESC LIMIT 20`,
      [user.id]
    );
    return ok(reports);
  } catch (err) {
    return serverError("reports", err);
  }
}

const generateSchema = z.object({
  report_type: z.enum(["monthly", "quarterly", "annual"]).default("monthly"),
});

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json().catch(() => ({}));
    const parsed = generateSchema.safeParse(body ?? {});
    const reportType = parsed.success ? parsed.data.report_type : "monthly";
    const months = reportType === "monthly" ? 1 : reportType === "quarterly" ? 3 : 12;
    const period = new Date().toISOString().slice(0, 7);

    const [totals, categoryBreakdown, goals, budgetRows] = await Promise.all([
      queryOne<{ income: string; expenses: string }>(
        `SELECT
           COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'Income'), 0) AS income,
           COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'Expense'), 0) AS expenses
         FROM transactions
        WHERE user_id = $1
          AND date >= date_trunc('month', CURRENT_DATE) - ($2 || ' months')::interval
          AND date < date_trunc('month', CURRENT_DATE) + interval '1 month'`,
        [user.id, months]
      ),
      query<{ category: string; income: string; expenses: string }>(
        `SELECT category,
                COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'Income'), 0) AS income,
                COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'Expense'), 0) AS expenses
           FROM transactions
          WHERE user_id = $1
            AND date >= date_trunc('month', CURRENT_DATE) - ($2 || ' months')::interval
            AND date < date_trunc('month', CURRENT_DATE) + interval '1 month'
          GROUP BY category ORDER BY expenses DESC`,
        [user.id, months]
      ),
      query<{ name: string; target_amount: string; current_amount: string; deadline: string | null }>(
        `SELECT name, target_amount, current_amount, deadline
           FROM goals WHERE user_id = $1 AND status = 'active'`,
        [user.id]
      ),
      query<{ category: string; amount: string; spent: string }>(
        `SELECT b.category, b.amount,
                COALESCE(t.spent, 0) AS spent
           FROM budgets b
           LEFT JOIN (
             SELECT category, SUM(amount) AS spent
               FROM transactions
              WHERE user_id = $1 AND transaction_type = 'Expense'
                AND to_char(date, 'YYYY-MM') = $2
              GROUP BY category
           ) t ON t.category = b.category
          WHERE b.user_id = $1 AND b.month = ''`,
        [user.id, period]
      ),
    ]);

    // Portfolio performance (live prices for stocks). Only holdings in the
    // account currency fold into the totals; foreign-currency holdings are
    // reported as a note instead of being summed.
    const [holdings, account] = await Promise.all([
      query<{ symbol: string; portfolio_type: string; quantity: string; purchase_price: string; currency: string | null }>(
        "SELECT symbol, portfolio_type, quantity, purchase_price, currency FROM portfolios WHERE user_id = $1",
        [user.id]
      ),
      queryOne<{ currency: string | null }>("SELECT currency FROM users WHERE id = $1", [user.id]),
    ]);
    const accountCurrency = account?.currency ?? "USD";
    const foreignByCurrency = new Map<string, number>();
    const stockSet = [...new Set(holdings.filter((h) => h.portfolio_type === "stock").map((h) => h.symbol))];
    const priceMap = new Map<string, number | null>();
    await Promise.all(stockSet.map(async (s) => priceMap.set(s, await fetchStockPrice(s))));
    let portfolioValue = 0;
    let portfolioCost = 0;
    for (const h of holdings) {
      const holdingValue =
        num(h.quantity) *
        (h.portfolio_type === "stock" ? priceMap.get(h.symbol) ?? num(h.purchase_price) : num(h.purchase_price));
      const holdingCost = num(h.quantity) * num(h.purchase_price);
      const holdingCurrency = h.currency ?? accountCurrency;
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

    const income = num(totals?.income);
    const expenses = num(totals?.expenses);
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    const goalProgress = goals.map((g) => ({
      name: g.name,
      percentage: num(g.target_amount) > 0 ? (num(g.current_amount) / num(g.target_amount)) * 100 : 0,
      deadline: g.deadline,
    }));

    const budgetPerformance = budgetRows.map((b) => ({
      category: b.category,
      budget: num(b.amount),
      spent: num(b.spent),
      percentage: num(b.amount) > 0 ? (num(b.spent) / num(b.amount)) * 100 : null,
    }));

    // Rule-based recommendations, in the spirit of the original generator.
    const recommendations: string[] = [];
    if (savingsRate < 10) {
      recommendations.push("Your savings rate is below 10% — review discretionary categories first.");
    } else {
      recommendations.push(`Strong month: you saved ${savingsRate.toFixed(1)}% of your income.`);
    }
    for (const b of budgetPerformance) {
      if (b.percentage !== null && b.percentage > 100) {
        recommendations.push(`${b.category} exceeded its budget by ${Math.round(b.percentage - 100)}% — consider raising the limit or cutting back.`);
      }
    }
    if (portfolioCost > 0 && portfolioValue >= portfolioCost) {
      recommendations.push("Your investments are in profit — keep monitoring allocation risk.");
    }
    for (const [code, value] of foreignByCurrency) {
      recommendations.push(
        `Investments worth ${code} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} are held outside your display currency and excluded from the totals above — see the Investments page.`
      );
    }
    for (const g of goalProgress) {
      if (g.deadline && g.percentage < 50) {
        recommendations.push(`Goal "${g.name}" is under 50% with a deadline approaching — increase contributions.`);
      }
    }

    const report = {
      period,
      report_type: reportType,
      income_expense: { income, expenses, net: income - expenses, savingsRate },
      category_breakdown: categoryBreakdown,
      investment_performance: {
        value: portfolioValue,
        cost: portfolioCost,
        returnPct: portfolioCost > 0 ? ((portfolioValue - portfolioCost) / portfolioCost) * 100 : 0,
      },
      budget_performance: budgetPerformance,
      savings_progress: goalProgress,
      recommendations,
    };

    const saved = await queryOne<{ id: number }>(
      `INSERT INTO reports (user_id, report_type, report_data)
       VALUES ($1, $2, $3) RETURNING id`,
      [user.id, reportType, JSON.stringify(report)]
    );

    return ok({ id: saved?.id, report });
  } catch (err) {
    return serverError("report generation", err);
  }
}
