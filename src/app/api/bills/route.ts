import { z } from "zod";
import { ok, fail, serverError, requireUser, num } from "@/lib/api";
import { query, queryOne } from "@/lib/db";

const billSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().positive(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  frequency: z.enum(["Weekly", "Monthly", "Yearly"]),
  category: z.string().optional().nullable(),
  auto_pay: z.boolean().optional(),
  reminder_days: z.number().int().min(0).max(30).optional(),
});

/** GET /api/bills?days=30 — upcoming bills within the window. */
export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const days = Math.min(Math.max(num(new URL(req.url).searchParams.get("days"), 30), 1), 365);
    const bills = await query(
      `SELECT id, name, amount, to_char(due_date, 'YYYY-MM-DD') AS due_date,
              frequency, category, auto_pay, reminder_days, paid
         FROM bills
        WHERE user_id = $1
          AND due_date >= CURRENT_DATE
          AND due_date <= CURRENT_DATE + ($2 || ' days')::interval
        ORDER BY due_date ASC`,
      [user.id, days]
    );
    return ok(bills);
  } catch (err) {
    return serverError("bills", err);
  }
}

/** POST /api/bills — add a bill. */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json();
    const parsed = billSchema.safeParse(body);
    if (!parsed.success) return fail("Please check the bill details.");

    const b = parsed.data;
    const created = await queryOne<{ id: number }>(
      `INSERT INTO bills (user_id, name, amount, due_date, frequency,
                          category, auto_pay, reminder_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        user.id,
        b.name,
        b.amount,
        b.due_date,
        b.frequency,
        b.category ?? null,
        b.auto_pay ?? false,
        b.reminder_days ?? 0,
      ]
    );
    return ok(created);
  } catch (err) {
    return serverError("adding bill", err);
  }
}

/** PATCH /api/bills — mark a bill paid ({ id }). */
export async function PATCH(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json();
    const parsed = z.object({ id: z.number().int().positive() }).safeParse(body);
    if (!parsed.success) return fail("Missing bill id.");

    const bill = await queryOne<{ id: number; name: string; amount: string }>(
      `UPDATE bills SET paid = TRUE
        WHERE id = $1 AND user_id = $2
        RETURNING id, name, amount`,
      [parsed.data.id, user.id]
    );
    if (!bill) return fail("Bill not found.", 404);

    // A paid bill becomes an expense transaction.
    await query(
      `INSERT INTO transactions
         (user_id, transaction_type, category, description, amount, date)
       VALUES ($1, 'Expense', 'Utilities', $2, $3, CURRENT_DATE)`,
      [user.id, `Bill payment: ${bill.name}`, num(bill.amount)]
    );
    return ok(bill);
  } catch (err) {
    return serverError("paying bill", err);
  }
}

/** DELETE /api/bills?id=1 */
export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const id = num(new URL(req.url).searchParams.get("id"));
    if (!id) return fail("Missing bill id.");
    await query("DELETE FROM bills WHERE id = $1 AND user_id = $2", [id, user.id]);
    return ok({ deleted: id });
  } catch (err) {
    return serverError("deleting bill", err);
  }
}
