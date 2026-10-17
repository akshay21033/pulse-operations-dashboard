import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { ShipmentExplorer } from "@/components/shipment-explorer";
import { apiGet } from "@/lib/api";
import type { ShipmentPage } from "@/lib/types";

export const metadata: Metadata = { title: "Shipments" };

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const filters = {
    q: first(raw.q),
    status: first(raw.status),
    region: first(raw.region),
    from: first(raw.from),
    to: first(raw.to),
    sort: first(raw.sort),
    direction: first(raw.direction),
  };

  // The first page is fetched on the server so it ships in the initial HTML.
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, cursor: first(raw.cursor) }))
    if (value) query.set(key, value);
  const result = await apiGet<ShipmentPage>(`/api/shipments?${query}`);

  return (
    <div className="page-wrap">
      <header className="topbar">
        <div className="breadcrumbs">
          <Link href="/">Workspace</Link>
          <span className="crumb-slash" aria-hidden="true">
            /
          </span>
          <strong>Shipments</strong>
        </div>
      </header>
      <div className="content">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              NETWORK OVERVIEW
            </div>
            <h1>Shipments</h1>
            <p className="subtitle">Track every order moving through your network.</p>
          </div>
          {result.ok && (
            <div className="welcome-actions">
              <span className="shipment-total">
                <Package size={15} aria-hidden="true" />
                {result.data.total.toLocaleString()} shipments
              </span>
            </div>
          )}
        </div>
        <ShipmentExplorer filters={filters} result={result} />
      </div>
    </div>
  );
}
