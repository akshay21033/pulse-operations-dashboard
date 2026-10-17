import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, Clock3, Package, Search, Truck, CheckCircle2 } from "lucide-react";
import { RetryButton } from "@/components/retry-button";
import { ErrorState } from "@/components/states";
import { StatusPill } from "@/components/status-pill";
import { apiGet } from "@/lib/api";
import { formatDate, relativeTime, statusClass } from "@/lib/format";
import { REGIONS, STATUSES, type Summary } from "@/lib/types";

const n = (value: number) => value.toLocaleString("en-US");

export default async function Overview() {
  const res = await apiGet<Summary>("/api/summary");

  return (
    <div className="page-wrap">
      <header className="topbar">
        <div className="breadcrumbs">
          <span>Workspace</span>
          <span className="crumb-slash" aria-hidden="true">
            /
          </span>
          <strong>Overview</strong>
        </div>
        <div className="top-actions">
          <Link href="/shipments" className="top-search">
            <Search size={15} aria-hidden="true" />
            <span>Search shipments…</span>
          </Link>
        </div>
      </header>
      <div className="content">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              {res.ok
                ? formatDate(res.data.serverTime, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }).toUpperCase()
                : "TODAY"}
            </div>
            <h1>Operations overview</h1>
            <p className="subtitle">Here&apos;s what&apos;s happening across your supply chain right now.</p>
          </div>
          <div className="welcome-actions">
            <RetryButton label="Refresh" className="button-secondary" />
            <Link href="/shipments" className="button-primary">
              <Package size={15} aria-hidden="true" /> View shipments
            </Link>
          </div>
        </div>

        {!res.ok ? (
          <ErrorState title="The overview didn’t load" message={res.message} />
        ) : (
          <Dashboard summary={res.data} />
        )}
      </div>
    </div>
  );
}

function Dashboard({ summary: s }: { summary: Summary }) {
  const active = s.total - s.byStatus.Delivered;
  return (
    <>
      <div className="metric-grid">
        <Metric
          title="Active shipments"
          value={n(active)}
          detail={`of ${n(s.total)} total`}
          icon={Package}
          tone="violet"
        />
        <Metric
          title="In transit"
          value={n(s.byStatus["In transit"])}
          detail="moving normally"
          icon={Truck}
          tone="blue"
        />
        <Metric
          title="Delivered"
          value={n(s.byStatus.Delivered)}
          detail={`${Math.round((s.byStatus.Delivered / s.total) * 100)}% of all shipments`}
          icon={CheckCircle2}
          tone="green"
        />
        <Metric
          title="Need attention"
          value={n(s.openCount)}
          detail={`${s.byStatus.Exception} critical · ${s.byStatus["At risk"]} at risk`}
          icon={Clock3}
          tone="orange"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel shipment-panel" aria-labelledby="breakdown-h">
          <div className="panel-heading">
            <div>
              <h2 id="breakdown-h">Network breakdown</h2>
              <p>Live counts from the shipment database</p>
            </div>
          </div>
          <Bars
            title="By status"
            rows={STATUSES.map((k) => ({ label: k, value: s.byStatus[k], tone: statusClass(k) }))}
            total={s.total}
          />
          <Bars
            title="By region"
            rows={REGIONS.map((k) => ({ label: k, value: s.byRegion[k], tone: "region" }))}
            total={s.total}
          />
        </section>

        <section className="panel attention-panel" aria-labelledby="attention-h">
          <div className="panel-heading">
            <div>
              <h2 id="attention-h">
                Needs attention <span className="attention-badge">{s.openCount}</span>
              </h2>
              <p>Most urgent first</p>
            </div>
            <Link href="/exceptions" className="text-link">
              View all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className="attention-list">
            {s.open.map((x) => (
              <Link href={`/shipments/${x.id}`} className="attention-item" key={x.id}>
                <span
                  className={`attention-icon ${x.status === "Exception" ? "critical" : "warning"}`}
                  aria-hidden="true"
                >
                  {x.status === "Exception" ? <Package size={15} /> : <Clock3 size={15} />}
                </span>
                <span className="attention-copy">
                  <strong>{x.exception || "Shipment running behind"}</strong>
                  <small>
                    {x.id} · {x.destination}
                  </small>
                </span>
                <span className="attention-time">{relativeTime(x.updated, s.serverTime)}</span>
              </Link>
            ))}
          </div>
          <Link href="/exceptions" className="attention-footer">
            Open exception queue <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
      </div>

      <section className="panel table-panel" aria-labelledby="recent-h">
        <div className="panel-heading table-heading">
          <div>
            <h2 id="recent-h">Recently updated</h2>
            <p>The latest changes across your network</p>
          </div>
          <Link href="/shipments" className="button-secondary">
            All shipments <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Recently updated shipments, scrollable">
          <table className="data-table">
            <caption className="sr-only">Six most recently updated shipments</caption>
            <thead>
              <tr>
                <th scope="col">Shipment</th>
                <th scope="col">Route</th>
                <th scope="col">Carrier</th>
                <th scope="col">Status</th>
                <th scope="col">Est. delivery</th>
              </tr>
            </thead>
            <tbody>
              {s.recent.map((x) => (
                <tr key={x.id}>
                  <td>
                    <Link href={`/shipments/${x.id}`} className="shipment-id">
                      {x.id}
                    </Link>
                    <span className="cell-secondary">{x.customer}</span>
                  </td>
                  <td>
                    <span className="route-cell">
                      {x.origin}
                      <span aria-label="to">→</span>
                      {x.destination}
                    </span>
                    <span className="cell-secondary">{x.region} region</span>
                  </td>
                  <td>
                    <span className="carrier-cell">
                      <span className="carrier-mark" aria-hidden="true">
                        {x.carrier.slice(0, 1)}
                      </span>
                      {x.carrier}
                    </span>
                  </td>
                  <td>
                    <StatusPill status={x.status} />
                  </td>
                  <td>{formatDate(x.eta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Metric({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ComponentType<{ size?: number }>;
  tone: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <span className={`metric-icon ${tone}`} aria-hidden="true">
          <Icon size={17} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">
        <span>{detail}</span>
      </div>
    </article>
  );
}

function Bars({
  title,
  rows,
  total,
}: {
  title: string;
  rows: Array<{ label: string; value: number; tone: string }>;
  total: number;
}) {
  return (
    <div className="breakdown">
      <h3>{title}</h3>
      {rows.map((r) => (
        <div className="bar-row" key={r.label}>
          <span className="bar-label">{r.label}</span>
          <div className="bar-track" role="img" aria-label={`${r.label}: ${n(r.value)} of ${n(total)}`}>
            <i className={`bar-fill ${r.tone}`} style={{ width: `${(r.value / total) * 100}%` }} />
          </div>
          <span className="bar-value">{n(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
