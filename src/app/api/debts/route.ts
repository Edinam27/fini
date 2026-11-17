import { z } from "zod";
import { ok, fail, serverError, requireUser, num } from "@/lib/api";
import { query, queryOne } from "@/lib/db";

/**
 * Debts live in the transactions table under category 'debt', exactly as the
 * original app stored them, with payments recorded as linked 'debt_payment'
 * rows. GET returns the list plus analysis (total debt, average interest).
 */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const debts = await query<DebtRow>(
      `SELECT id, description AS name, amount,
              COALESCE(interest_rate, 0) AS interest_rate,
              COALESCE(minimum_payment, 0) AS minimum_payment,
              to_char(date, 'YYYY-MM-DD') AS start_date
         FROM transactions
        WHERE user_id = $1 AND category = 'debt' AND amount > 0
        ORDER BY interest_rate DESC NULLS LAST`,
      [user.id]
    );

    const totalDebt = debts.reduce((a, d) => a + num(d.amount), 0);
    const rates = debts.map((d) => num(d.interest_rate));
    const averageInterest =
      rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;

    return ok({ debts, totalDebt, averageInterest });
  } catch (err) {
    return serverError("debts", err);
  }
}

const addDebtSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().positive(),
  interest_rate: z.number().min(0).max(100),
  minimum_payment: z.number().min(0).optional(),
});

/** POST /api/debts — add a debt. */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json();
    const parsed = addDebtSchema.safeParse(body);
    if (!parsed.success) return fail("Enter the debt name and amount.");

    const d = parsed.data;
    const created = await queryOne<{ id: number }>(
      `INSERT INTO transactions
         (user_id, category, description, amount, interest_rate,
          minimum_payment, transaction_type, date)
       VALUES ($1, 'debt', $2, $3, $4, $5, 'Expense', CURRENT_DATE)
       RETURNING id`,
      [user.id, d.name, d.amount, d.interest_rate, d.minimum_payment ?? 0]
    );
    return ok(created);
  } catch (err) {
    return serverError("adding debt", err);
  }
}

const paymentSchema = z.object({
  debt_id: z.number().int().positive(),
  amount: z.number().positive(),
});

/** PATCH /api/debts — make a payment against a debt. */
export async function PATCH(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) return fail("Enter a payment amount.");

    const { debt_id, amount } = parsed.data;
    const debt = await queryOne<{ id: number; amount: string }>(
      `SELECT id, amount FROM transactions
        WHERE id = $1 AND user_id = $2 AND category = 'debt'`,
      [debt_id, user.id]
    );
    if (!debt) return fail("Debt not found.", 404);

    const currentAmount = num(debt.amount);
    if (amount > currentAmount) {
      return fail("Payment exceeds the remaining balance.");
    }

    // Reduce the debt balance and record the payment as an expense.
    await query(
      "UPDATE transactions SET amount = amount - $2 WHERE id = $1",
      [debt_id, amount]
    );
    await query(
      `INSERT INTO transactions
         (user_id, category, description, amount, transaction_type,
          date, related_debt_id)
       VALUES ($1, 'debt_payment', 'Debt Payment', $2, 'Expense', CURRENT_DATE, $3)`,
      [user.id, amount, debt_id]
    );

    return ok({ remaining: currentAmount - amount });
  } catch (err) {
    return serverError("debt payment", err);
  }
}

/** DELETE /api/debts?id=1 — remove a debt entry. */
export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const id = num(new URL(req.url).searchParams.get("id"));
    if (!id) return fail("Missing debt id.");
    await query(
      "DELETE FROM transactions WHERE id = $1 AND user_id = $2 AND category = 'debt'",
      [id, user.id]
    );
    return ok({ deleted: id });
  } catch (err) {
    return serverError("deleting debt", err);
  }
}

interface DebtRow {
  id: number;
  name: string;
  amount: string;
  interest_rate: string;
  minimum_payment: string;
  start_date: string;
}
