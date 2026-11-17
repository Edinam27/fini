import { z } from "zod";
import { ok, fail, serverError } from "@/lib/api";
import { hashPassword, validatePassword, createSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

const registerSchema = z.object({
  username: z.string().min(2).max(40).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Please provide a valid username, email and password.");
    }
    const { username, email, password } = parsed.data;

    const check = validatePassword(password);
    if (!check.ok) return fail(check.message);

    const existing = await queryOne<{ id: number }>(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existing) {
      return fail("Username or email is already taken.");
    }

    const passwordHash = await hashPassword(password);
    const created = await queryOne<{ id: number; username: string; email: string }>(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username, email, passwordHash]
    );

    if (!created) return fail("Could not create your account.", 500);

    await createSession(created.id);
    await query("UPDATE users SET last_login = NOW() WHERE id = $1", [created.id]);
    return ok({ ...created, onboarded: false });
  } catch (err) {
    return serverError("registration", err);
  }
}
