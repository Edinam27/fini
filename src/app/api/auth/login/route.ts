import { z } from "zod";
import { ok, fail, serverError } from "@/lib/api";
import { verifyPassword, createSession } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return fail("Enter your username and password.");

    const { username, password } = parsed.data;
    const user = await queryOne<{
      id: number;
      username: string;
      email: string;
      password_hash: string;
      onboarded: boolean;
    }>(
      `SELECT id, username, email, password_hash,
              (onboarded_at IS NOT NULL) AS onboarded
         FROM users WHERE username = $1`,
      [username]
    );

    // Same generic error for unknown user and wrong password (no user enumeration).
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return fail("Invalid username or password", 401);
    }

    await createSession(user.id);
    await query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
    return ok({
      id: user.id,
      username: user.username,
      email: user.email,
      onboarded: user.onboarded,
    });
  } catch (err) {
    return serverError("login", err);
  }
}
