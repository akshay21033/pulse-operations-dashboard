import { apiRoute } from "@/lib/route";
import { exceptionFeed } from "@/lib/store";

export async function GET() {
  return apiRoute({ kind: "read" }, exceptionFeed);
}
