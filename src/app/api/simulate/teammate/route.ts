import { apiRoute } from "@/lib/route";
import { simulateTeammateEdit } from "@/lib/store";

/** Demo hook for the concurrency flow: a simulated teammate edits a random open exception. */
export async function POST() {
  return apiRoute({ kind: "write", requireRole: "manager" }, () => ({ changed: simulateTeammateEdit()?.id ?? null }));
}
