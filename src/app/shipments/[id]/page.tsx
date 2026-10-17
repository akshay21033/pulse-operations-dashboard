import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Box, CalendarDays, Check, MapPin, Package, ShieldCheck, Truck } from "lucide-react";
import { ErrorState, PanelError } from "@/components/states";
import { StatusPill } from "@/components/status-pill";
import { apiGet } from "@/lib/api";
import { formatDate, formatTimeUtc } from "@/lib/format";
import type { CarrierEvent, Shipment } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: (await params).id };
}

const DAY = 86_400_000;

/** Tracking milestones derived from the ETA and progress so the page stays consistent with the data. */
function buildTimeline(s: Shipment) {
  const eta = Date.parse(s.eta);
  const at = (days: number) => new Date(eta - days * DAY).toISOString();
  return [
    { title: "Shipment created", detail: "Order information received", at: at(5), done: true },
    { title: "Picked up by carrier", detail: `Collected by ${s.carrier}`, at: at(4), done: s.progress >= 10 },
    {
      title: "Departed origin facility",
      detail: `Left ${s.origin} distribution center`,
      at: at(3),
      done: s.progress >= 30,
    },
    {
      title: s.status === "Delivered" ? "Delivered" : `In transit to ${s.destination}`,
      detail: `Moving toward ${s.destination}`,
      at: at(1),
      done: s.status === "Delivered",
      current: s.status !== "Delivered",
    },
    { title: "Out for delivery", detail: "Final mile delivery", at: s.eta, done: s.status === "Delivered" },
  ];
}

export default async function ShipmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Primary content: awaited here so loading.tsx covers it. The slow carrier panel below streams separately.
  const res = await apiGet<Shipment>(`/api/shipments/${encodeURIComponent(id)}`);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <div className="page-wrap">
        <header className="topbar">
          <Link href="/shipments" className="back-link">
            <ArrowLeft size={15} aria-hidden="true" /> Shipments
          </Link>
        </header>
        <div className="content">
          <ErrorState title="Shipment details unavailable" message={res.message} />
        </div>
      </div>
    );
  }
  const s = res.data;
  const timeline = buildTimeline(s);

  return (
    <div className="page-wrap">
      <header className="topbar">
        <div className="breadcrumbs">
          <Link href="/">Workspace</Link>
          <span className="crumb-slash" aria-hidden="true">
            /
          </span>
          <Link href="/shipments">Shipments</Link>
          <span className="crumb-slash" aria-hidden="true">
            /
          </span>
          <strong>{s.id}</strong>
        </div>
      </header>
      <div className="content">
        <Link href="/shipments" className="back-link">
          <ArrowLeft size={15} aria-hidden="true" /> Back to shipments
        </Link>
        <div className="detail-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              SHIPMENT DETAILS
            </div>
            <h1>{s.id}</h1>
            <p className="subtitle">
              {s.customer} <span className="middot">·</span> Last updated {formatDate(s.updated)},{" "}
              {formatTimeUtc(s.updated)}
            </p>
          </div>
          <StatusPill status={s.status} />
        </div>

        <div className="detail-layout">
          <div className="detail-main">
            <section className="panel detail-progress" aria-labelledby="progress-h">
              <div className="panel-heading">
                <div>
                  <h2 id="progress-h">Delivery progress</h2>
                  <p>
                    Estimated delivery{" "}
                    <strong>{formatDate(s.eta, { weekday: "long", month: "long", day: "numeric" })}</strong>
                  </p>
                </div>
                <span className="detail-progress-pct">{s.progress}%</span>
              </div>
              <div
                className="big-progress"
                role="progressbar"
                aria-valuenow={s.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Delivery progress"
              >
                <i style={{ width: `${s.progress}%` }} />
              </div>
              <div className="route-summary">
                <div>
                  <span className="route-dot origin-dot" />
                  <span>
                    <small>ORIGIN</small>
                    <strong>{s.origin}</strong>
                  </span>
                </div>
                <div className="route-line" aria-hidden="true">
                  <i />
                  <Truck size={17} />
                  <i />
                </div>
                <div>
                  <span className="route-dot dest-dot" />
                  <span>
                    <small>DESTINATION</small>
                    <strong>{s.destination}</strong>
                  </span>
                </div>
              </div>
            </section>

            <section className="panel timeline-panel" aria-labelledby="timeline-h">
              <div className="panel-heading">
                <div>
                  <h2 id="timeline-h">Tracking history</h2>
                  <p>Latest shipment updates</p>
                </div>
              </div>
              <ol className="timeline">
                {timeline.map((t, i) => (
                  <li key={t.title} className={`${t.done ? "complete" : ""} ${t.current ? "current" : ""}`}>
                    <span className="timeline-marker" aria-hidden="true">
                      {t.done ? <Check size={12} /> : i + 1}
                    </span>
                    <div>
                      <strong>{t.title}</strong>
                      <p>{t.detail}</p>
                    </div>
                    <time dateTime={t.at}>{formatDate(t.at)}</time>
                  </li>
                ))}
              </ol>
            </section>

            {/* Slow, flaky secondary panel: streams in without blocking the content above. */}
            <Suspense fallback={<CarrierLoading />}>
              <CarrierHistory id={s.id} />
            </Suspense>
          </div>

          <aside className="detail-sidebar" aria-label="Shipment summary">
            <section className="panel info-panel">
              <div className="panel-heading">
                <h2>Shipment info</h2>
              </div>
              <Info icon={Box} label="Carrier" value={s.carrier} />
              <Info icon={Package} label="Service" value="Standard freight" />
              <Info
                icon={CalendarDays}
                label="Est. delivery"
                value={formatDate(s.eta, { month: "short", day: "numeric", year: "numeric" })}
              />
              <Info icon={MapPin} label="Region" value={`${s.region} region`} />
              <Info icon={ShieldCheck} label="Declared value" value={`$${s.value.toLocaleString("en-US")}`} />
            </section>
            <section className="panel recipient-panel">
              <div className="panel-heading">
                <h2>Recipient</h2>
              </div>
              <div className="recipient-avatar" aria-hidden="true">
                {s.customer.slice(0, 1)}
              </div>
              <strong>{s.customer}</strong>
              <span>Receiving department</span>
              <div className="recipient-address">
                <MapPin size={14} aria-hidden="true" />
                <span>
                  {s.destination} Distribution Center
                  <br />
                  {s.region}, United States
                </span>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

async function CarrierHistory({ id }: { id: string }) {
  const res = await apiGet<{ events: CarrierEvent[] }>(`/api/shipments/${encodeURIComponent(id)}/carrier-history`, {
    retries: 0,
    timeoutMs: 10_000,
  });
  return (
    <section className="panel carrier-panel" aria-labelledby="carrier-h">
      <div className="panel-heading">
        <div>
          <h2 id="carrier-h">Carrier history</h2>
          <p>Partner updates and handoffs</p>
        </div>
        {res.ok && <span className="history-tag">LIVE</span>}
      </div>
      {!res.ok && <PanelError message={`Carrier updates are unavailable right now. ${res.message}`} />}
      {res.ok && res.data.events.length === 0 && <p className="loading-caption">No carrier events yet.</p>}
      {res.ok &&
        res.data.events.map((e) => (
          <div className="carrier-history-row" key={e.id}>
            <span className="history-icon" aria-hidden="true">
              <Truck size={15} />
            </span>
            <span>
              <strong>{e.title}</strong>
              <small>{e.detail}</small>
            </span>
            <time dateTime={e.at}>
              {formatDate(e.at)}, {formatTimeUtc(e.at)}
            </time>
          </div>
        ))}
    </section>
  );
}

function CarrierLoading() {
  return (
    <section className="panel carrier-panel" aria-busy="true" aria-labelledby="carrier-h">
      <div className="panel-heading">
        <div>
          <h2 id="carrier-h">Carrier history</h2>
          <p>Partner updates and handoffs</p>
        </div>
      </div>
      <div className="loading-placeholder" aria-hidden="true">
        <i />
        <i />
      </div>
      <span className="loading-caption" role="status">
        Loading carrier updates…
      </span>
    </section>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Box; label: string; value: string }) {
  return (
    <div className="info-row">
      <Icon size={15} aria-hidden="true" />
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}
