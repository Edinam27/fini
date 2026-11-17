import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";

/** Consistent API response envelope per project pattern. */
export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, error: null, ...(meta ? { meta } : {}) });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error }, { status });
}

export function serverError(scope: string, err: unknown) {
  // Log context server-side; never leak internals to the client.
  console.error(`[${scope}]`, err);
  return NextResponse.json(
    { success: false, data: null, error: `Something went wrong with ${scope}.` },
    { status: 500 }
  );
}

export async function requireUser(): Promise<
  { user: SessionUser; error: null } | { user: null; error: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: fail("You must be signed in.", 401) };
  }
  return { user, error: null };
}

export function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
