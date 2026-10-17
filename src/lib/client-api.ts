import type { ApiResult } from "./types";

type Options = { method?: "GET" | "POST" | "PATCH"; body?: unknown; timeoutMs?: number };

/** Browser-side request helper: same never-throws, always-times-out contract as the server one. */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, timeoutMs = 8000 }: Options = {},
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) return { ok: true, data: json as T };
    return { ok: false, status: res.status, message: String(json.error ?? "Request failed."), details: json };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "The service did not respond in time. Check your connection and try again.",
    };
  }
}
