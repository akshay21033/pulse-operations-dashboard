"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="page-wrap">
      <div className="content">
        <div className="state-card" role="alert">
          <div className="state-icon error">
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <h2>Something went wrong</h2>
          <p>This page hit an unexpected error. Nothing was lost. Try again, and if it keeps happening, reload.</p>
          <button type="button" className="button-primary" onClick={reset}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
