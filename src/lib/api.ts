import { cookies, headers } from "next/headers";
import type { ApiResult } from "./types";

type Options = { retries?: number; timeoutMs?: number };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Server-side GET against our own route handlers. Forwards the session cookie
 * so role checks apply, never throws, enforces a timeout (no infinite spinners)
 * and retries transient 5xx/network failures.
 */
export async function apiGet<T>(path: string, { retries = 1, timeoutMs = 8000 }: Options = {}): Promise<ApiResult<T>> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "http";
  const cookie = (await cookies()).toString();

  let last: ApiResult<T> = { ok: false, status: 0, message: "Request failed." };
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(`${protocol}://${host}${path}`, {
        cache: "no-store",
        headers: { cookie },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.ok) return { ok: true, data: body as T };
      last = { ok: false, status: res.status, message: String(body.error ?? "Request failed."), details: body };
      if (res.status < 500) return last;
    } catch {
      last = { ok: false, status: 0, message: "The service did not respond in time." };
    }
    if (attempt < retries) await wait(250 * (attempt + 1));
  }
  return last;
}
