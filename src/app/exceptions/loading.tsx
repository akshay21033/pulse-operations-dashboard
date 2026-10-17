export default function ExceptionsLoading() {
  return (
    <div className="page-wrap" role="status" aria-label="Loading exception queue">
      <header className="topbar">
        <div className="breadcrumbs">
          Workspace <span className="crumb-slash">/</span> Exception queue
        </div>
      </header>
      <div className="content">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">OPERATIONS CENTER</div>
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-copy" />
          </div>
        </div>
        <div className="queue-summary">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <div className="skeleton" style={{ height: 34, width: 34 }} />
              <div className="skeleton" style={{ height: 22, width: 65 }} />
            </div>
          ))}
        </div>
        <div className="loading-placeholder">
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} style={{ height: 100 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
