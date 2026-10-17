import { apiRoute } from "@/lib/route";
import { summarize } from "@/lib/store";

export async function GET() {
  return apiRoute({ kind: "read" }, summarize);
}
