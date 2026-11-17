"use client";

export interface Envelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as Envelope<T>;
  if (!json.success) throw new Error(json.error ?? "Request failed");
  return json.data;
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as Envelope<T>;
  if (!json.success) throw new Error(json.error ?? "Request failed");
  return json.data;
}
