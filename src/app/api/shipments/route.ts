import type { NextRequest } from "next/server";
import { paginate } from "@/lib/query";
import { apiRoute } from "@/lib/route";
import { allShipments } from "@/lib/store";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const limit = Number(p.get("limit"));
  return apiRoute({ kind: "read" }, () =>
    paginate(allShipments(), {
      q: p.get("q") || undefined,
      status: p.get("status") || undefined,
      region: p.get("region") || undefined,
      from: p.get("from") || undefined,
      to: p.get("to") || undefined,
      sort: p.get("sort") || undefined,
      direction: p.get("direction") || undefined,
      cursor: p.get("cursor") || undefined,
      limit: limit > 0 ? limit : undefined,
    }),
  );
}
