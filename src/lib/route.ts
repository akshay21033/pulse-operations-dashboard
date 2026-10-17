import { NextResponse } from "next/server";
import { getRole } from "./auth";
import { simulateNetwork } from "./chaos";
import { ApiError } from "./errors";
import type { Role } from "./types";

type Options = {
  kind: "read" | "write";
  /** Enforced on the server, regardless of what the UI shows. */
  requireRole?: Role;
};

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Wraps a route handler: role check -> simulated latency/failure -> handler.
 * Handlers throw ApiError for expected failures (404, 409, ...).
 */
export async function apiRoute(options: Options, handler: () => unknown | Promise<unknown>) {
  try {
    if (options.requireRole === "manager" && (await getRole()) !== "manager") {
      throw new ApiError(403, "Manager role required for this action.");
    }
    await simulateNetwork(options.kind);
    return NextResponse.json(await handler(), { headers: NO_STORE });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, ...error.details }, { status: error.status, headers: NO_STORE });
    }
    console.error(error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500, headers: NO_STORE });
  }
}
