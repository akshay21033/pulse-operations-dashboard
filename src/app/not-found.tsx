import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-wrap">
      <div className="content">
        <div className="state-card">
          <div className="state-icon" aria-hidden="true">
            404
          </div>
          <h2>Shipment not found</h2>
          <p>That shipment ID may have changed or no longer exists.</p>
          <Link className="button-primary" href="/shipments">
            Back to shipments
          </Link>
        </div>
      </div>
    </div>
  );
}
