import { z } from "zod";
import { ok, fail, serverError } from "@/lib/api";
import { hashPassword, validatePassword } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { randomBytes } from "crypto";

// Step 1: request a reset token (username + email must match, as in the original).
const requestSchema = z.object({
  stage: z.literal("request"),
  username: z.string().min(1),
  email: z.string().email(),
});

// Step 2: consume the token and set the new password.
const confirmSchema = z.object({
  stage: z.literal("confirm"),
  token: z.string().min(10),
  password: z.string(),
});

const bodySchema = z.union([requestSchema, confirmSchema]);

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return fail("Invalid password reset request.");

    if (parsed.data.stage === "request") {
      const { username, email } = parsed.data;
      const user = await queryOne<{ id: number }>(
        "SELECT id FROM users WHERE username = $1 AND email = $2",
        [username, email]
      );
      if (!user) return fail("Username and email combination not found.");

      // Token valid for 1 hour, as in the original app.
      const token = randomBytes(32).toString("hex");
      await query(
        `UPDATE users
            SET reset_token = $1, reset_token_expiry = NOW() + interval '1 hour'
          WHERE id = $2`,
        [token, user.id]
      );
      return ok({
        message: "Password reset token generated. It expires in 1 hour.",
        token, // With no mail server configured, the token is returned directly.
      });
    }

    // stage === "confirm"
    const { token, password } = parsed.data;
    const check = validatePassword(password);
    if (!check.ok) return fail(check.message);

    const user = await queryOne<{ id: number }>(
      `SELECT id FROM users
        WHERE reset_token = $1 AND reset_token_expiry > NOW()`,
      [token]
    );
    if (!user) return fail("This reset token is invalid or has expired.");

    const passwordHash = await hashPassword(password);
    await query(
      `UPDATE users
          SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL
        WHERE id = $2`,
      [passwordHash, user.id]
    );
    return ok({ message: "Password updated. You can now sign in." });
  } catch (err) {
    return serverError("password reset", err);
  }
}
