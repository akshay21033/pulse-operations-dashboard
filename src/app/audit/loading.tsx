export default function AuditLoading() {
  return (
    <div className="page-wrap" role="status" aria-label="Loading audit log">
      <div className="content">
        <div className="skeleton skeleton-title" />
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
