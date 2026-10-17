import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export default function ShipmentLoading() {
  return (
    <div className="page-wrap" role="status" aria-label="Loading shipment">
      <header className="topbar">
        <Link href="/shipments" className="back-link">
          <ArrowLeft size={15} /> Shipments
        </Link>
      </header>
      <div className="content">
        <div className="back-link">← Back to shipments</div>
        <div className="detail-heading">
          <div>
            <div className="eyebrow">SHIPMENT DETAILS</div>
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-copy" />
          </div>
        </div>
        <div className="detail-layout">
          <div className="detail-main">
            <section className="panel detail-progress">
              <div className="panel-heading">
                <div>
                  <div className="skeleton skeleton-subtitle" />
                  <div className="skeleton skeleton-copy" />
                </div>
              </div>
              <div className="skeleton skeleton-progress" />
              <div className="skeleton skeleton-route" />
            </section>
            <section className="panel timeline-panel">
              <div className="panel-heading">
                <div>
                  <div className="skeleton skeleton-subtitle" />
                  <div className="skeleton skeleton-copy" />
                </div>
              </div>
              <div className="loading-placeholder">
                <i />
                <i />
                <i />
                <i />
              </div>
            </section>
          </div>
          <aside className="detail-sidebar">
            <section className="panel info-panel">
              <div className="loading-placeholder">
                <i />
                <i />
                <i />
                <i />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
