import { z } from "zod";
import { ok, fail, serverError, requireUser } from "@/lib/api";
import { query, queryOne } from "@/lib/db";

/** GET /api/settings — merged defaults + saved settings + profile info. */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const row = await queryOne<{
      username: string;
      email: string;
      currency: string;
      life_stage: string;
      risk_profile: string;
      savings: string;
      notifications: Record<string, boolean> | null;
      settings: Record<string, unknown> | null;
      created_date: string;
      last_login: string | null;
    }>(
      `SELECT username, email, currency, life_stage, risk_profile, savings,
              notifications, settings, created_date, last_login
         FROM users WHERE id = $1`,
      [user.id]
    );
    if (!row) return fail("User not found.", 404);

    return ok({
      username: row.username,
      email: row.email,
      currency: row.currency,
      lifeStage: row.life_stage,
      riskProfile: row.risk_profile,
      savings: Number(row.savings),
      notifications: {
        email: true,
        push: false,
        bill_reminders: true,
        budget_alerts: true,
        investment_alerts: true,
        ...(row.notifications ?? {}),
      },
      settings: row.settings ?? {},
      memberSince: row.created_date,
      lastLogin: row.last_login,
    });
  } catch (err) {
    return serverError("settings", err);
  }
}

const settingsSchema = z.object({
  currency: z.enum(["USD", "EUR", "GBP", "JPY", "GHS"]).optional(),
  theme: z.string().optional(),
  lifeStage: z.string().optional(),
  riskProfile: z.string().optional(),
  savings: z.number().min(0).optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      bill_reminders: z.boolean().optional(),
      budget_alerts: z.boolean().optional(),
      investment_alerts: z.boolean().optional(),
    })
    .optional(),
});

/**
 * PUT /api/settings — save preferences. Currency changes are recorded but
 * historical amounts are NOT rewritten (the original app's destructive
 * re-conversion of every stored amount was a data-loss footgun).
 */
export async function PUT(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid settings payload.");
    const s = parsed.data;

    const updates: string[] = [];
    const params: unknown[] = [];
    const set = (column: string, value: unknown) => {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    };

    if (s.currency) set("currency", s.currency);
    if (s.lifeStage) set("life_stage", s.lifeStage);
    if (s.riskProfile) set("risk_profile", s.riskProfile);
    if (s.savings !== undefined) set("savings", s.savings);
    if (s.notifications) {
      params.push(JSON.stringify(s.notifications));
      updates.push(`notifications = $${params.length}::jsonb`);
    }
    if (s.theme || s.currency || s.lifeStage || s.riskProfile) {
      const patch: Record<string, string> = {};
      if (s.theme) patch.theme = s.theme;
      if (s.currency) patch.currency = s.currency;
      if (s.lifeStage) patch.lifeStage = s.lifeStage;
      if (s.riskProfile) patch.riskProfile = s.riskProfile;
      params.push(JSON.stringify(patch));
      updates.push(
        `settings = COALESCE(settings, '{}'::jsonb) || $${params.length}::jsonb`
      );
    }

    if (updates.length > 0) {
      params.push(user.id);
      await query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${params.length}`, params);
    }
    return ok({ saved: true });
  } catch (err) {
    return serverError("saving settings", err);
  }
}
