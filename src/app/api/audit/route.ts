import { apiRoute } from "@/lib/route";
import { getAudit } from "@/lib/store";

export async function GET() {
  return apiRoute({ kind: "read", requireRole: "manager" }, () => ({ entries: getAudit() }));
}
