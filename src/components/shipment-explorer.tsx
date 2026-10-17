"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { parseSort, type SortField } from "@/lib/query";
import { REGIONS, STATUSES, type ApiResult, type ShipmentFilters, type ShipmentPage } from "@/lib/types";
import { EmptyState, ErrorState } from "./states";
import { StatusPill } from "./status-pill";

type Props = {
  filters: ShipmentFilters & { sort?: string; direction?: string };
  result: ApiResult<ShipmentPage>;
};

const columns: Array<{ label: string; field: SortField }> = [
  { label: "Shipment / customer", field: "id" },
  { label: "Route", field: "destination" },
  { label: "Carrier", field: "carrier" },
  { label: "Status", field: "status" },
  { label: "Est. delivery", field: "eta" },
  { label: "Progress", field: "progress" },
];

export function ShipmentExplorer({ filters, result }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const sort = parseSort(filters.sort, filters.direction);
  const hasFilters = Boolean(filters.q || filters.status || filters.region || filters.from || filters.to);
  const badRange = Boolean(filters.from && filters.to && filters.from > filters.to);

  // Every state change goes through the URL, so refresh/back/share all just work.
  // `latest` tracks the params of the most recent navigation, including ones still pending in a transition,
  // so two quick changes (e.g. status then region) both end up in the URL instead of the second one winning alone.
  const latest = useRef(search.toString());
  useEffect(() => {
    latest.current = search.toString();
  }, [search]);

  function navigate(change: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(latest.current);
    change(p);
    latest.current = p.toString();
    startTransition(() => router.push(`${pathname}?${latest.current}`, { scroll: false }));
  }
  const setFilter = (key: string, value: string) =>
    navigate((p) => {
      if (value) p.set(key, value);
      else p.delete(key);
      p.delete("cursor");
    });
  const setSort = (field: SortField) =>
    navigate((p) => {
      p.set("sort", field);
      p.set("direction", sort.field === field && sort.direction === 1 ? "desc" : "asc");
      p.delete("cursor");
    });
  const goTo = (cursor: string | null) => navigate((p) => (cursor ? p.set("cursor", cursor) : p.delete("cursor")));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const page = result.ok ? result.data : null;
  const rangeText =
    page && page.items.length > 0
      ? `${page.startIndex + 1}–${page.startIndex + page.items.length} of ${page.total.toLocaleString()}`
      : "0 results";

  return (
    <>
      <div className="explorer-toolbar" role="search">
        <form
          className="filter-search"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("q", query.trim());
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search shipments"
            placeholder="Search shipments, customers…"
          />
          <kbd aria-hidden="true">/</kbd>
        </form>
        <div className="filter-controls">
          <label className="filter-select">
            <SlidersHorizontal size={14} aria-hidden="true" />
            <select
              aria-label="Filter by status"
              value={filters.status ?? ""}
              onChange={(e) => setFilter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={13} aria-hidden="true" />
          </label>
          <label className="filter-select">
            <select
              aria-label="Filter by region"
              value={filters.region ?? ""}
              onChange={(e) => setFilter("region", e.target.value)}
            >
              <option value="">All regions</option>
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <ChevronDown size={13} aria-hidden="true" />
          </label>
          <div className="filter-date" role="group" aria-label="Estimated delivery date range">
            <CalendarDays size={14} aria-hidden="true" />
            <input
              type="date"
              aria-label="Delivery from"
              value={filters.from ?? ""}
              onChange={(e) => setFilter("from", e.target.value)}
            />
            <span aria-hidden="true">to</span>
            <input
              type="date"
              aria-label="Delivery to"
              value={filters.to ?? ""}
              onChange={(e) => setFilter("to", e.target.value)}
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              className="clear-filters"
              onClick={() => {
                setQuery("");
                startTransition(() => router.push(pathname));
              }}
            >
              Clear <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {badRange && (
        <p className="field-error" role="alert">
          The start date is after the end date, so nothing can match.
        </p>
      )}

      <div className="table-panel explorer-table" data-pending={pending || undefined} aria-busy={pending}>
        <p className="sr-only" role="status" aria-live="polite">
          {pending ? "Loading shipments" : result.ok ? `Showing ${rangeText} shipments` : "Shipments failed to load"}
        </p>

        {!result.ok && (
          <ErrorState
            title="Shipments didn’t load"
            message={`${result.message} Your filters are kept in the URL, so nothing is lost.`}
          />
        )}

        {page && (
          <>
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Shipments table, scrollable">
              <table className="data-table">
                <caption className="sr-only">
                  Shipments sorted by {sort.field} {sort.direction === 1 ? "ascending" : "descending"}. {rangeText}.
                </caption>
                <thead>
                  <tr>
                    {columns.map(({ label, field }) => {
                      const active = sort.field === field;
                      const Icon = !active ? ArrowUpDown : sort.direction === 1 ? ArrowUp : ArrowDown;
                      return (
                        <th
                          key={field}
                          scope="col"
                          aria-sort={active ? (sort.direction === 1 ? "ascending" : "descending") : "none"}
                        >
                          <button type="button" className="sort-head" onClick={() => setSort(field)}>
                            <span className="head-label">{label}</span>
                            <Icon size={13} aria-hidden="true" />
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/shipments/${s.id}`} className="shipment-id">
                          {s.id}
                        </Link>
                        <span className="cell-secondary">{s.customer}</span>
                      </td>
                      <td>
                        <span className="route-cell">
                          {s.origin}
                          <span aria-label="to">→</span>
                          {s.destination}
                        </span>
                        <span className="cell-secondary">{s.region}</span>
                      </td>
                      <td>
                        <span className="carrier-cell">
                          <span className="carrier-mark" aria-hidden="true">
                            {s.carrier.slice(0, 1)}
                          </span>
                          {s.carrier}
                        </span>
                      </td>
                      <td>
                        <StatusPill status={s.status} />
                      </td>
                      <td>{formatDate(s.eta, { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td>
                        <div className="progress-cell">
                          <div className="progress-track" aria-hidden="true">
                            <i style={{ width: `${s.progress}%` }} />
                          </div>
                          <span>{s.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {page.items.length === 0 && (
                <EmptyState
                  title="No shipments match these filters"
                  message="Try adjusting your search or clearing a filter."
                />
              )}
            </div>

            <div className="pagination">
              <span>
                Showing <strong>{rangeText}</strong> shipments
              </span>
              <div>
                <button type="button" disabled={!page.prevCursor || pending} onClick={() => goTo(page.prevCursor)}>
                  <ArrowLeft size={14} aria-hidden="true" /> Previous
                </button>
                <button type="button" disabled={!page.nextCursor || pending} onClick={() => goTo(page.nextCursor)}>
                  Next <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
