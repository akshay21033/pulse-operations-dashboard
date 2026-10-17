import { describe, expect, it } from "vitest";
import { ApiError } from "./errors";
import { filterShipments, paginate, parseSort, SORT_FIELDS } from "./query";
import { createSeed } from "./seed";

const all = createSeed(Date.UTC(2026, 9, 17, 12), 1200);

/** Walks every page forward and returns all ids in order. */
function walk(query: Parameters<typeof paginate>[1]) {
  const ids: string[] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 200; guard += 1) {
    const page = paginate(all, { ...query, cursor });
    ids.push(...page.items.map((s) => s.id));
    if (!page.nextCursor) return ids;
    cursor = page.nextCursor;
  }
  throw new Error("pagination did not terminate");
}

describe("seed data", () => {
  it("has 1,200 unique shipments", () => {
    expect(all).toHaveLength(1200);
    expect(new Set(all.map((s) => s.id)).size).toBe(1200);
  });
});

describe("cursor pagination", () => {
  for (const field of SORT_FIELDS) {
    for (const direction of ["asc", "desc"]) {
      it(`visits every row exactly once sorted by ${field} ${direction}`, () => {
        const ids = walk({ sort: field, direction });
        expect(ids).toHaveLength(1200);
        expect(new Set(ids).size).toBe(1200);
      });
    }
  }

  it("returns rows in the requested order", () => {
    const { items } = paginate(all, { sort: "progress", direction: "asc", limit: 100 });
    const values = items.map((s) => s.progress);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it("pages backwards to exactly the previous page", () => {
    const first = paginate(all, { sort: "eta", direction: "asc" });
    const second = paginate(all, { sort: "eta", direction: "asc", cursor: first.nextCursor! });
    const back = paginate(all, { sort: "eta", direction: "asc", cursor: second.prevCursor! });
    expect(back.items.map((s) => s.id)).toEqual(first.items.map((s) => s.id));
    expect(back.prevCursor).toBeNull();
    expect(second.startIndex).toBe(25);
  });

  it("has no previous cursor on page one and no next cursor on the last page", () => {
    expect(paginate(all, {}).prevCursor).toBeNull();
    const last = paginate(all, { limit: 100, cursor: paginate(all, { limit: 100 }).nextCursor! });
    expect(last.items.length).toBeGreaterThan(0);
    const ids = walk({ limit: 100 });
    expect(ids).toHaveLength(1200);
  });

  it("is stable when an unrelated row changes between requests", () => {
    const first = paginate(all, { sort: "customer", direction: "asc" });
    const mutated = all.map((s) => (s.id === all[900].id ? { ...s, progress: 1 } : s));
    const fromOriginal = paginate(all, { sort: "customer", direction: "asc", cursor: first.nextCursor! });
    const fromMutated = paginate(mutated, { sort: "customer", direction: "asc", cursor: first.nextCursor! });
    expect(fromMutated.items.map((s) => s.id)).toEqual(fromOriginal.items.map((s) => s.id));
  });

  it("rejects a malformed cursor", () => {
    expect(() => paginate(all, { cursor: "not-a-cursor" })).toThrow(ApiError);
    const wrongType = Buffer.from(JSON.stringify({ v: "x", id: "PLS-1", d: "n" })).toString("base64url");
    expect(() => paginate(all, { sort: "progress", cursor: wrongType })).toThrow(ApiError);
  });

  it("restarts from the top when the cursor points past the end", () => {
    const beyond = Buffer.from(JSON.stringify({ v: "9999", id: "zzz", d: "n" })).toString("base64url");
    const page = paginate(all, { sort: "id", direction: "asc", cursor: beyond });
    expect(page.startIndex).toBe(0);
  });

  it("clamps the page size", () => {
    expect(paginate(all, { limit: 100000 }).items).toHaveLength(100);
    expect(paginate(all, { limit: -5 }).items).toHaveLength(25);
  });
});

describe("sorting + filtering", () => {
  it("falls back to the default for an unknown sort field", () => {
    expect(parseSort("__proto__").field).toBe("updated");
    expect(parseSort("password", "asc").field).toBe("updated");
  });

  it("filters by status, region and date range together", () => {
    const rows = filterShipments(all, { status: "In transit", region: "West", from: "2026-10-20", to: "2026-10-25" });
    expect(rows.length).toBeGreaterThan(0);
    for (const s of rows) {
      expect(s.status).toBe("In transit");
      expect(s.region).toBe("West");
      expect(s.eta.slice(0, 10) >= "2026-10-20" && s.eta.slice(0, 10) <= "2026-10-25").toBe(true);
    }
  });

  it("searches id, customer, route and carrier case-insensitively", () => {
    expect(filterShipments(all, { q: "  MAERSK " }).every((s) => s.carrier === "Maersk")).toBe(true);
    expect(filterShipments(all, { q: "pls-004821" })).toHaveLength(1);
  });

  it("paginates within filters and reports the filtered total", () => {
    const page = paginate(all, { status: "Exception" });
    expect(page.total).toBe(all.filter((s) => s.status === "Exception").length);
  });
});
