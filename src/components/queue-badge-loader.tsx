import { apiGet } from "@/lib/api";
import type { Summary } from "@/lib/types";
import { QueueBadge } from "./queue-badge";

/** Async server component, streamed in behind <Suspense> so it never blocks the shell. Hidden on failure. */
export async function QueueBadgeLoader() {
  const res = await apiGet<Summary>("/api/summary", { retries: 0, timeoutMs: 5000 });
  return res.ok ? <QueueBadge initial={res.data.openCount} /> : null;
}
