export default function ShipmentsLoading() {
  return (
    <div className="page-wrap" role="status" aria-label="Loading shipments">
      <header className="topbar">
        <div className="breadcrumbs">
          Workspace <span className="crumb-slash">/</span> Shipments
        </div>
      </header>
      <div className="content">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">NETWORK OVERVIEW</div>
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-copy" />
          </div>
        </div>
        <section className="panel explorer-table">
          <div className="loading-placeholder">
            <i />
            <i />
            <i />
          </div>
          {Array.from({ length: 7 }, (_, i) => (
            <div className="skeleton" key={i} style={{ height: 46, margin: "8px 14px" }} />
          ))}
        </section>
      </div>
    </div>
  );
}
