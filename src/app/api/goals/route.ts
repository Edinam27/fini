import { z } from "zod";
import { ok, fail, serverError, requireUser, num } from "@/lib/api";
import { query, queryOne } from "@/lib/db";

const goalSchema = z.object({
  name: z.string().min(1).max(120),
  target_amount: z.number().positive(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

/** GET /api/goals — goals with computed progress + on-track flag. */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const goals = await query<{
      id: number;
      name: string;
      target_amount: string;
      current_amount: string;
      deadline: string | null;
      status: string;
      created_date: string;
    }>(
      `SELECT id, name, target_amount, current_amount,
              to_char(deadline, 'YYYY-MM-DD') AS deadline, status, created_date
         FROM goals WHERE user_id = $1 AND status = 'active'
        ORDER BY deadline ASC NULLS LAST`,
      [user.id]
    );

    const today = new Date();
    const enriched = goals.map((g) => {
      const current = num(g.current_amount);
      const target = num(g.target_amount);
      const percentage = target > 0 ? (current / target) * 100 : 0;
      const daysRemaining = g.deadline
        ? Math.ceil((new Date(g.deadline).getTime() - today.getTime()) / 86_400_000)
        : null;
      // On-track: daily required saving is still positive (or already met).
      const onTrack =
        daysRemaining !== null && daysRemaining > 0
          ? (target - current) / daysRemaining >= 0
          : daysRemaining === null
            ? percentage > 0
            : current >= target;
      return {
        ...g,
        percentage: Math.min(percentage, 100),
        daysRemaining,
        onTrack,
        remainingAmount: Math.max(target - current, 0),
      };
    });

    return ok(enriched);
  } catch (err) {
    return serverError("goals", err);
  }
}

/** POST /api/goals — add a goal. */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json();
    const parsed = goalSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Please enter a goal name and a target amount greater than 0.");
    }
    const g = parsed.data;
    const created = await queryOne<{ id: number }>(
      `INSERT INTO goals (user_id, name, target_amount, deadline)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [user.id, g.name, g.target_amount, g.deadline ?? null]
    );

    // Keep the legacy JSON mirror on the user row in sync.
    await query(
      `UPDATE users
          SET goals = COALESCE(goals, '[]'::jsonb) || $2::jsonb
        WHERE id = $1`,
      [
        user.id,
        JSON.stringify([
          {
            name: g.name,
            amount: g.target_amount,
            deadline: g.deadline ?? null,
            created_date: new Date().toISOString().slice(0, 10),
          },
        ]),
      ]
    );
    return ok(created);
  } catch (err) {
    return serverError("adding goal", err);
  }
}

/** PATCH /api/goals — contribute toward a goal ({ id, amount }). */
export async function PATCH(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json();
    const parsed = z
      .object({ id: z.number().int().positive(), amount: z.number().positive() })
      .safeParse(body);
    if (!parsed.success) return fail("Enter a contribution amount.");

    const { id, amount } = parsed.data;
    const updated = await queryOne<{ target_amount: string; current_amount: string; status: string }>(
      `UPDATE goals
          SET current_amount = LEAST(current_amount + $2, target_amount),
              status = CASE WHEN current_amount + $2 >= target_amount
                            THEN 'completed' ELSE status END
        WHERE id = $1 AND user_id = $3
        RETURNING target_amount, current_amount, status`,
      [id, amount, user.id]
    );
    if (!updated) return fail("Goal not found.", 404);
    return ok(updated);
  } catch (err) {
    return serverError("goal contribution", err);
  }
}

/** DELETE /api/goals?id=1 */
export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const id = num(new URL(req.url).searchParams.get("id"));
    if (!id) return fail("Missing goal id.");
    await query("UPDATE goals SET status = 'archived' WHERE id = $1 AND user_id = $2", [
      id,
      user.id,
    ]);
    return ok({ deleted: id });
  } catch (err) {
    return serverError("deleting goal", err);
  }
}
