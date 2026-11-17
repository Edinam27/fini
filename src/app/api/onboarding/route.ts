import { z } from "zod";
import { ok, fail, serverError, requireUser } from "@/lib/api";
import { query, queryOne } from "@/lib/db";

/**
 * POST /api/onboarding — persists the welcome wizard in one shot:
 * profile preferences, income sources, category budgets, starter goals,
 * optional sample data, and marks onboarding complete.
 */
const onboardingSchema = z.object({
  currency: z.enum(["USD", "EUR", "GBP", "JPY", "GHS"]),
  lifeStage: z.string().min(1),
  riskProfile: z.string().min(1),
  savings: z.number().min(0),
  income: z.record(z.string(), z.number().min(0)),
  budgets: z.record(z.string(), z.number().min(0)),
  goals: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        target_amount: z.number().positive(),
        deadline: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
      })
    )
    .max(4)
    .optional()
    .default([]),
  seedSample: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) return fail("Please complete the onboarding steps.");
    const o = parsed.data;

    const incomeTotal = Object.values(o.income).reduce((a, b) => a + b, 0);

    // Recurring category budgets.
    for (const [category, amount] of Object.entries(o.budgets)) {
      if (amount <= 0) continue;
      await query(
        `INSERT INTO budgets (user_id, category, amount, month)
         VALUES ($1, $2, $3, '')
         ON CONFLICT (user_id, category, month)
         DO UPDATE SET amount = $3`,
        [user.id, category, amount]
      );
    }

    // Starter goals.
    for (const g of o.goals) {
      await query(
        `INSERT INTO goals (user_id, name, target_amount, deadline)
         VALUES ($1, $2, $3, $4)`,
        [user.id, g.name, g.target_amount, g.deadline ?? null]
      );
    }

    // Optional sample transactions so the dashboard tells a story on day one.
    if (o.seedSample) {
      const samples: Array<[string, string, number, string, number]> = [
        // [type, category, amount, description, daysAgo]
        ["Income", "Salary", 4200, "Monthly salary", 35],
        ["Income", "Freelance", 650, "Logo design project", 21],
        ["Expense", "Housing", 1250, "Rent", 30],
        ["Expense", "Utilities", 145.6, "Electricity + water", 28],
        ["Expense", "Food", 312.4, "Groceries — weekly shop", 25],
        ["Expense", "Food", 87.2, "Groceries — top-up", 18],
        ["Expense", "Transportation", 96, "Fuel + transit card", 16],
        ["Expense", "Entertainment", 54.99, "Streaming subscriptions", 12],
        ["Expense", "Insurance", 120, "Health insurance premium", 9],
        ["Expense", "Food", 268.9, "Groceries — weekly shop", 6],
        ["Expense", "Transportation", 42, "Ride share", 4],
        ["Expense", "Entertainment", 35, "Cinema night", 2],
      ];
      for (const [type, category, amount, description, daysAgo] of samples) {
        await query(
          `INSERT INTO transactions
             (user_id, transaction_type, category, amount, description,
              payment_method, date)
           VALUES ($1, $2, $3, $4, $5, $6,
                   CURRENT_DATE - ($7 || ' days')::interval)`,
          [user.id, type, category, amount, description, "Bank Transfer", daysAgo]
        );
      }
      await query(
        `INSERT INTO bills (user_id, name, amount, due_date, frequency, category, auto_pay, reminder_days)
         VALUES
           ($1, 'Internet', 85, CURRENT_DATE + interval '5 days', 'Monthly', 'Utilities', TRUE, 3),
           ($1, 'Rent', 1250, CURRENT_DATE + interval '12 days', 'Monthly', 'Housing', FALSE, 5),
           ($1, 'Netflix', 15.99, CURRENT_DATE + interval '18 days', 'Monthly', 'Entertainment', TRUE, 2)`,
        [user.id]
      );
    }

    const settingsPatch = JSON.stringify({
      currency: o.currency,
      lifeStage: o.lifeStage,
      riskProfile: o.riskProfile,
      // Budget pages and dashboard alerts read these maps from settings.
      income: o.income,
      budget: o.budgets,
    });

    await queryOne<{ id: number }>(
      `UPDATE users
          SET currency = $2,
              life_stage = $3,
              risk_profile = $4,
              savings = $5,
              income = $6,
              onboarded_at = NOW(),
              settings = COALESCE(settings, '{}'::jsonb) || $7::jsonb,
              notifications = COALESCE(notifications, '{}'::jsonb)
        WHERE id = $1
        RETURNING id`,
      [
        user.id,
        o.currency,
        o.lifeStage,
        o.riskProfile,
        o.savings,
        incomeTotal,
        settingsPatch,
      ]
    );

    return ok({ completed: true });
  } catch (err) {
    return serverError("onboarding", err);
  }
}

/** DELETE /api/onboarding — re-open the wizard (Settings escape hatch). */
export async function DELETE() {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    await query("UPDATE users SET onboarded_at = NULL WHERE id = $1", [user.id]);
    return ok({ restarted: true });
  } catch (err) {
    return serverError("onboarding restart", err);
  }
}
