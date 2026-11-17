import { z } from "zod";
import { ok, fail, serverError, requireUser, num } from "@/lib/api";
import { query, queryOne } from "@/lib/db";

/**
 * Budget planner + tracking.
 * GET  /api/budget?month=YYYY-MM → income sources, per-category budgets,
 *                                  spent amounts, remaining, % used, alerts.
 * POST /api/budget → save income sources + category budgets (settings JSONB
 *                    and budgets table, mirroring the original app).
 */
export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return fail("Invalid month.");

    const userRow = await queryOne<{ settings: BudgetSettings }>(
      "SELECT settings FROM users WHERE id = $1",
      [user.id]
    );
    const settings: BudgetSettings = userRow?.settings ?? {};
    const incomeSources: Record<string, number> = settings.income ?? {};
    const totalIncome = Object.values(incomeSources).reduce((a, b) => a + b, 0);

    const budgetRows = await query<{ category: string; amount: string }>(
      "SELECT category, amount FROM budgets WHERE user_id = $1 AND month = ''",
      [user.id]
    );

    const spentRows = await query<{ category: string; spent: string }>(
      `SELECT category, SUM(amount) AS spent
         FROM transactions
        WHERE user_id = $1
          AND transaction_type = 'Expense'
          AND to_char(date, 'YYYY-MM') = $2
        GROUP BY category`,
      [user.id, month]
    );
    const spentByCategory = new Map(spentRows.map((r) => [r.category, num(r.spent)]));

    const categories = budgetRows.map((r) => ({
      category: r.category,
      budget: num(r.amount),
      spent: spentByCategory.get(r.category) ?? 0,
    }));

    // Include categories with spending but no budget set.
    for (const [category, spent] of spentByCategory) {
      if (!categories.some((c) => c.category === category)) {
        categories.push({ category, budget: 0, spent });
      }
    }

    const totalBudget = categories.reduce((a, c) => a + c.budget, 0);
    const totalSpent = categories.reduce((a, c) => a + c.spent, 0);

    const threshold = num(settings.budget_alerts?.threshold, 80);
    const alerts = categories
      .filter((c) => c.budget > 0 && c.spent > c.budget * (threshold / 100))
      .map(
        (c) =>
          `Warning: ${c.category} spending at ${((c.spent / c.budget) * 100).toFixed(1)}% of budget`
      );

    return ok({
      month,
      incomeSources,
      totalIncome,
      categories: categories.sort((a, b) => b.spent - a.spent),
      totalBudget,
      totalSpent,
      remaining: totalIncome - totalBudget,
      alerts,
      threshold,
    });
  } catch (err) {
    return serverError("budget", err);
  }
}

interface BudgetSettings {
  income?: Record<string, number>;
  budget_alerts?: { threshold?: number };
  [key: string]: unknown;
}

const saveSchema = z.object({
  income: z.record(z.string(), z.number().min(0)),
  budgets: z.record(z.string(), z.number().min(0)),
});

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) return fail("Enter your income and budget amounts.");

    const { income, budgets } = parsed.data;
    const incomeTotal = Object.values(income).reduce((a, b) => a + b, 0);

    // Upsert recurring category budgets.
    const entries = Object.entries(budgets);
    for (const [category, amount] of entries) {
      await query(
        `INSERT INTO budgets (user_id, category, amount, month)
         VALUES ($1, $2, $3, '')
         ON CONFLICT (user_id, category, month)
         DO UPDATE SET amount = $3`,
        [user.id, category, amount]
      );
    }

    // Merge income + budget into user settings, preserving other keys.
    await query(
      `UPDATE users
          SET settings = jsonb_set(
                jsonb_set(COALESCE(settings, '{}'::jsonb), '{income}', $2::jsonb),
                '{budget}', $3::jsonb),
              income = $4
        WHERE id = $1`,
      [
        user.id,
        JSON.stringify(income),
        JSON.stringify(budgets),
        incomeTotal,
      ]
    );

    return ok({ saved: true });
  } catch (err) {
    return serverError("saving budget", err);
  }
}
