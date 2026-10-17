import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState } from "@/components/states";
import { ExceptionQueue } from "@/components/exception-queue";
import { apiGet } from "@/lib/api";
import { getRole } from "@/lib/auth";
import type { ExceptionFeed } from "@/lib/types";

export const metadata: Metadata = { title: "Exception queue" };

export default async function ExceptionsPage() {
  const [role, feed] = await Promise.all([getRole(), apiGet<ExceptionFeed>("/api/exceptions")]);
  return (
    <div className="page-wrap">
      <header className="topbar">
        <div className="breadcrumbs">
          <Link href="/">Workspace</Link>
          <span className="crumb-slash" aria-hidden="true">
            /
          </span>
          <strong>Exception queue</strong>
        </div>
      </header>
      <div className="content">
        <div className="welcome-row">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              OPERATIONS CENTER
            </div>
            <h1>Exception queue</h1>
            <p className="subtitle">Review, resolve, and escalate shipments that need attention.</p>
          </div>
          <span className="queue-live">
            <i />
            {role === "manager" ? "Manager" : "View only"}
          </span>
        </div>
        {feed.ok ? (
          <ExceptionQueue initial={feed.data} role={role} />
        ) : (
          <ErrorState title="The queue didn’t load" message={feed.message} />
        )}
      </div>
    </div>
  );
}
