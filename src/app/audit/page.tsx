import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/states";
import { apiGet } from "@/lib/api";
import { formatDate, formatTimeUtc } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Audit log" };

/** Manager-only route. The API enforces it too, so hiding the nav link is just a convenience. */
export default async function AuditPage() {
  const res = await apiGet<{ entries: AuditEntry[] }>("/api/audit");
  return (
    <div className="page-wrap">
      <header className="topbar">
        <div className="breadcrumbs">
          <Link href="/">Workspace</Link>
          <span className="crumb-slash" aria-hidden="true">
            /
          </span>
          <strong>Audit log</strong>
        </div>
      </header>
      <div className="content">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              MANAGERS ONLY
            </div>
            <h1>Audit log</h1>
            <p className="subtitle">Every resolve and escalate action since the server started.</p>
          </div>
        </div>
        {!res.ok && res.status === 403 && (
          <ForbiddenState message="Switch to the Manager role to view the audit log." />
        )}
        {!res.ok && res.status !== 403 && <ErrorState title="The audit log didn’t load" message={res.message} />}
        {res.ok && res.data.entries.length === 0 && (
          <EmptyState title="No actions yet" message="Resolve or escalate an exception and it will be recorded here." />
        )}
        {res.ok && res.data.entries.length > 0 && (
          <div className="table-panel">
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Audit log table, scrollable">
              <table className="data-table">
                <caption className="sr-only">Actions taken on shipments, newest first</caption>
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Shipment</th>
                    <th scope="col">Action</th>
                    <th scope="col">By</th>
                  </tr>
                </thead>
                <tbody>
                  {res.data.entries.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {formatDate(e.at)}, {formatTimeUtc(e.at)}
                      </td>
                      <td>
                        <Link className="shipment-id" href={`/shipments/${e.shipmentId}`}>
                          {e.shipmentId}
                        </Link>
                      </td>
                      <td>{e.action === "resolve" ? "Resolved" : "Escalated"}</td>
                      <td>{e.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
