import { z } from "zod";
import { ok, fail, serverError, requireUser, num, str } from "@/lib/api";
import { query, queryOne } from "@/lib/db";

export const transactionSchema = z.object({
  transaction_type: z.enum(["Income", "Expense"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().min(1),
  subcategory: z.string().optional().nullable(),
  amount: z.number().positive(),
  description: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  recurring: z.boolean().optional(),
  tags: z.string().optional().nullable(),
});

/** GET /api/transactions?type=&category=&from=&to=&sort=&limit= */
export async function GET(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const type = str(url.searchParams.get("type"));
    const category = str(url.searchParams.get("category"));
    const from = str(url.searchParams.get("from"));
    const to = str(url.searchParams.get("to"));
    const sort = url.searchParams.get("sort") ?? "date-desc";
    const limit = Math.min(num(url.searchParams.get("limit"), 200), 500);

    const where: string[] = ["user_id = $1"];
    const params: unknown[] = [user.id];

    if (type === "Income" || type === "Expense") {
      where.push(`transaction_type = $${params.push(type)}`);
    }
    if (category) {
      where.push(`category = $${params.push(category)}`);
    }
    if (from) where.push(`date >= $${params.push(from)}`);
    if (to) where.push(`date <= $${params.push(to)}`);

    const orderBy =
      sort === "date-asc"
        ? "date ASC"
        : sort === "amount-desc"
          ? "amount DESC"
          : sort === "amount-asc"
            ? "amount ASC"
            : "date DESC, id DESC";

    const rows = await query(
      `SELECT id, transaction_type, category, subcategory, description,
              amount, payment_method, recurring, tags,
              to_char(date, 'YYYY-MM-DD') AS date
         FROM transactions
        WHERE ${where.join(" AND ")}
        ORDER BY ${orderBy}
        LIMIT $${params.push(limit)}`,
      params
    );
    return ok(rows);
  } catch (err) {
    return serverError("transactions", err);
  }
}

/** POST /api/transactions — add one transaction. */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) return fail("Please check the transaction details.");

    const t = parsed.data;
    const created = await queryOne<{ id: number }>(
      `INSERT INTO transactions
         (user_id, transaction_type, category, subcategory, amount,
          description, payment_method, recurring, tags, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        user.id,
        t.transaction_type,
        t.category,
        t.subcategory ?? null,
        t.amount,
        t.description ?? null,
        t.payment_method ?? null,
        t.recurring ?? false,
        t.tags ?? null,
        t.date,
      ]
    );
    return ok(created);
  } catch (err) {
    return serverError("adding transaction", err);
  }
}

/** DELETE /api/transactions?id=123 */
export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const id = num(new URL(req.url).searchParams.get("id"));
    if (!id) return fail("Missing transaction id.");
    await query(
      "DELETE FROM transactions WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    return ok({ deleted: id });
  } catch (err) {
    return serverError("deleting transaction", err);
  }
}

