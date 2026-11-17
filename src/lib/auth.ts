import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { query, queryOne } from "./db";

export const SESSION_COOKIE = "fp_session";
/** Idle timeout, matching the original app's 30-minute session behavior. */
const IDLE_TIMEOUT_MINUTES = 30;
const SESSION_TTL_DAYS = 7;

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  /** True once the welcome wizard has been completed or skipped. */
  onboarded: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Password policy from the original app: 8+ chars, lower, upper, digit. */
export function validatePassword(
  password: string
): { ok: boolean; message: string } {
  if (password.length < 8)
    return { ok: false, message: "Password must be at least 8 characters long" };
  if (!/[a-z]/.test(password))
    return { ok: false, message: "Password must contain lowercase letters" };
  if (!/[A-Z]/.test(password))
    return { ok: false, message: "Password must contain uppercase letters" };
  if (!/[0-9]/.test(password))
    return { ok: false, message: "Password must contain numbers" };
  return { ok: true, message: "Password is valid" };
}

export async function createSession(userId: number): Promise<void> {
  const sessionId = randomBytes(32).toString("hex");
  await query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
    [sessionId, userId, SESSION_TTL_DAYS]
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

/** Resolve the current user, refreshing the sliding idle window. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const row = await queryOne<{
    id: number;
    username: string;
    email: string;
    onboarded: boolean;
  }>(
    `SELECT u.id, u.username, u.email,
            (u.onboarded_at IS NOT NULL) AS onboarded
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
        AND s.expires_at > NOW()`,
    [sessionId]
  );
  if (!row) return null;

  // Sliding idle timeout: extend when more than half the idle window elapsed.
  await query(
    `UPDATE sessions
        SET expires_at = LEAST(
          NOW() + ($2 || ' minutes')::interval,
          created_at + ($3 || ' days')::interval)
      WHERE id = $1`,
    [sessionId, IDLE_TIMEOUT_MINUTES, SESSION_TTL_DAYS]
  );
  return row;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await query("DELETE FROM sessions WHERE id = $1", [sessionId]);
  }
  jar.delete(SESSION_COOKIE);
}

/** Throws a Response-shaped error helper for API routes. */
export class UnauthorizedError extends Error {}
