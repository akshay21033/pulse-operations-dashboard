import { statusClass } from "@/lib/format";
import type { Status } from "@/lib/types";

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`status-pill ${statusClass(status)}`}>
      <i aria-hidden="true" />
      {status}
    </span>
  );
}
