import { ROLE_LABEL, getRole } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { apiRoute } from "@/lib/route";
import { applyAction } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: { action?: unknown; version?: unknown } | null = await request.json().catch(() => null);
  return apiRoute({ kind: "write", requireRole: "manager" }, async () => {
    if (!body) throw new ApiError(400, "Request body must be valid JSON.");
    return applyAction(id, body.action, body.version, ROLE_LABEL[await getRole()]);
  });
}
