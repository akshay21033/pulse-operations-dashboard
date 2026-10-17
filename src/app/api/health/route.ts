import { apiRoute } from "@/lib/route";

export async function GET() {
  return apiRoute({ kind: "read" }, () => ({ status: "operational" }));
}
