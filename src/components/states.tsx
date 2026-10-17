import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Lock } from "lucide-react";
import { RetryButton } from "./retry-button";

type StateProps = { title: string; message: string; children?: ReactNode };

export function ErrorState({ title, message, retry = true, children }: StateProps & { retry?: boolean }) {
  return (
    <div className="state-card" role="alert">
      <div className="state-icon error">
        <AlertTriangle size={22} aria-hidden="true" />
      </div>
      <h2>{title}</h2>
      <p>{message}</p>
      {retry && <RetryButton />}
      {children}
    </div>
  );
}

export function EmptyState({ title, message, children }: StateProps) {
  return (
    <div className="state-card">
      <div className="state-icon">
        <Inbox size={22} aria-hidden="true" />
      </div>
      <h2>{title}</h2>
      <p>{message}</p>
      {children}
    </div>
  );
}

export function ForbiddenState({ message }: { message: string }) {
  return (
    <div className="state-card" role="alert">
      <div className="state-icon error">
        <Lock size={22} aria-hidden="true" />
      </div>
      <h2>Manager access required</h2>
      <p>{message}</p>
    </div>
  );
}

/** Inline (non-page) failure for a secondary panel. */
export function PanelError({ message }: { message: string }) {
  return (
    <div className="partial-warning" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <span>{message}</span>
      <RetryButton label="Retry" className="button-secondary" />
    </div>
  );
}
