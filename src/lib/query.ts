import { ApiError } from "./errors";
import type { ListQuery, Shipment, ShipmentFilters, ShipmentPage } from "./types";

/** Only these fields can be sorted on; anything else falls back to the default. */
export const SORT_FIELDS = [
  "id",
  "customer",
  "destination",
  "carrier",
  "status",
  "eta",
  "updated",
  "progress",
  "value",
] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const DEFAULT_SORT: { field: SortField; direction: 1 | -1 } = { field: "updated", direction: -1 };
export const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export function parseSort(sort?: string, direction?: string): { field: SortField; direction: 1 | -1 } {
  const field = SORT_FIELDS.find((f) => f === sort);
  if (!field) return DEFAULT_SORT;
  return { field, direction: direction === "asc" ? 1 : -1 };
}

export function filterShipments(all: readonly Shipment[], f: ShipmentFilters): Shipment[] {
  const q = f.q?.toLowerCase().trim();
  return all.filter(
    (s) =>
      (!q || [s.id, s.customer, s.origin, s.destination, s.carrier].some((v) => v.toLowerCase().includes(q))) &&
      (!f.status || s.status === f.status) &&
      (!f.region || s.region === f.region) &&
      (!f.from || s.eta.slice(0, 10) >= f.from) &&
      (!f.to || s.eta.slice(0, 10) <= f.to),
  );
}

type Cursor = { v: string | number; id: string; d: "n" | "p" };

function encodeCursor(row: Shipment, field: SortField, d: Cursor["d"]): string {
  const cursor: Cursor = { v: row[field] as string | number, id: row.id, d };
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(raw: string, field: SortField): Cursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (parsed && typeof parsed === "object") {
      const { v, id, d } = parsed as Partial<Cursor>;
      const expectNumber = field === "progress" || field === "value";
      if (
        typeof id === "string" &&
        (d === "n" || d === "p") &&
        (expectNumber ? typeof v === "number" : typeof v === "string")
      ) {
        return { v: v as string | number, id, d };
      }
    }
  } catch {
    /* fall through */
  }
  throw new ApiError(400, "Invalid pagination cursor.");
}

const cmp = (a: string | number, b: string | number) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Keyset (cursor) pagination. The cursor stores the sort value and id of the
 * boundary row, so pages stay stable when rows elsewhere change, and the
 * cost does not depend on how deep the user is. `d` says which direction to
 * walk from the boundary, which gives us real "previous" pages as well.
 */
export function paginate(all: readonly Shipment[], query: ListQuery): ShipmentPage {
  const { field, direction } = parseSort(query.sort, query.direction);
  const requested = Math.trunc(query.limit ?? Number.NaN);
  const limit = requested >= 1 ? Math.min(requested, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

  const order = (a: string | number, aId: string, b: string | number, bId: string) =>
    direction * (cmp(a, b) || cmp(aId, bId));

  const rows = filterShipments(all, query).sort((a, b) => order(a[field], a.id, b[field], b.id));

  let start = 0;
  let end = Math.min(limit, rows.length);

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor, field);
    const relation = (row: Shipment) => order(row[field], row.id, cursor.v, cursor.id);
    if (cursor.d === "n") {
      const idx = rows.findIndex((row) => relation(row) > 0);
      start = idx === -1 ? rows.length : idx;
      end = Math.min(start + limit, rows.length);
    } else {
      end = rows.findLastIndex((row) => relation(row) < 0) + 1;
      start = Math.max(0, end - limit);
    }
  }

  // A stale cursor (e.g. its page no longer exists after data changed) restarts from the top.
  if (query.cursor && start >= rows.length && rows.length > 0) {
    start = 0;
    end = Math.min(limit, rows.length);
  }

  const items = rows.slice(start, end);
  return {
    items,
    total: rows.length,
    startIndex: start,
    nextCursor: items.length > 0 && end < rows.length ? encodeCursor(rows[end - 1], field, "n") : null,
    prevCursor: items.length > 0 && start > 0 ? encodeCursor(rows[start], field, "p") : null,
  };
}
