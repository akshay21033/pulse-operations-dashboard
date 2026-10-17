export default function OverviewLoading() {
  return (
    <div className="page-wrap" role="status" aria-label="Loading overview">
      <header className="topbar">
        <div className="breadcrumbs">
          Workspace <span className="crumb-slash">/</span> Overview
        </div>
      </header>
      <div className="content">
        <div className="welcome-row">
          <div>
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-copy" />
          </div>
        </div>
        <div className="metric-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="metric-card" key={i}>
              <div className="skeleton skeleton-copy" />
              <div className="skeleton skeleton-title" />
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="loading-placeholder">
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>
    </div>
  );
}
