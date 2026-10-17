"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, CircleAlert, Clock3, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { usePolling } from "@/hooks/use-polling";
import { apiRequest } from "@/lib/client-api";
import { formatDate, formatTimeUtc } from "@/lib/format";
import type { ActionKind, ExceptionFeed, Role, Shipment } from "@/lib/types";
import { QUEUE_COUNT_EVENT } from "./queue-badge";
import { StatusPill } from "./status-pill";

type Row = {
  shipment: Shipment;
  /** Action currently in flight (optimistic state is applied while set). */
  pending?: ActionKind;
  /** Resolved rows are hidden optimistically but kept so a failure restores them in place. */
  hidden?: boolean;
  /** The write failed and was rolled back. */
  error?: { message: string; action: ActionKind };
  /** Somebody else changed the record first; the user decides what to do. */
  conflict?: { message: string; action: ActionKind };
  isNew?: boolean;
};

const POLL = { baseMs: 5000, maxMs: 60_000 };
const NEAR_TOP_PX = 120;

const isOpen = (s: Shipment) => s.status === "Exception" || s.status === "At risk";

/** Pure merge of a polled feed into the rows the user is looking at. Order stays stable to avoid jumping. */
function mergeFeed(prev: Row[], items: Shipment[], insertNew: boolean): Row[] {
  const incoming = new Map(items.map((s) => [s.id, s]));
  const next: Row[] = [];
  for (const row of prev) {
    const fresh = incoming.get(row.shipment.id);
    incoming.delete(row.shipment.id);
    if (row.pending)
      next.push(row); // never clobber an in-flight optimistic update
    else if (fresh) next.push(fresh.version === row.shipment.version ? row : { ...row, shipment: fresh });
    else if (row.conflict || row.error) next.push(row); // keep rows the user still has to deal with
    // otherwise it was resolved elsewhere: drop it
  }
  if (!insertNew) return next;
  const added = [...incoming.values()].map((shipment): Row => ({ shipment, isNew: true }));
  return [...added, ...next];
}

type Props = { initial: ExceptionFeed; role: Role };

export function ExceptionQueue({ initial, role }: Props) {
  const canAct = role === "manager";
  const [rows, setRows] = useState<Row[]>(() => initial.items.map((shipment) => ({ shipment })));
  const [feedItems, setFeedItems] = useState<Shipment[]>(initial.items);
  const [resolvedCount, setResolvedCount] = useState(initial.resolvedCount);
  const [notice, setNotice] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);

  // Highest version we've seen written by this user, so a slow (stale) poll can't resurrect or regress a row.
  const settled = useRef(new Map<string, number>());

  const poll = usePolling(
    useCallback(async () => {
      const res = await apiRequest<ExceptionFeed>("/api/exceptions");
      if (!res.ok) return false;
      const items = res.data.items.filter((s) => s.version >= (settled.current.get(s.id) ?? 0));
      const atTop = window.scrollY < NEAR_TOP_PX; // don't shove content around while the user is scrolled down
      setFeedItems(items);
      setResolvedCount(res.data.resolvedCount);
      setRows((prev) => mergeFeed(prev, items, atTop));
      return true;
    }, []),
    POLL,
  );

  const visible = rows.filter((r) => !r.hidden);
  const known = new Set(rows.map((r) => r.shipment.id));
  const waiting = feedItems.filter((s) => !known.has(s.id));
  const critical = visible.filter((r) => r.shipment.status === "Exception").length;
  const atRisk = visible.length - critical;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(QUEUE_COUNT_EVENT, { detail: visible.length }));
  }, [visible.length]);

  const patch = useCallback((id: string, change: Partial<Row> | ((r: Row) => Partial<Row>)) => {
    setRows((prev) =>
      prev.map((r) => (r.shipment.id === id ? { ...r, ...(typeof change === "function" ? change(r) : change) } : r)),
    );
  }, []);

  const runAction = useCallback(
    async (row: Row, action: ActionKind) => {
      const { shipment } = row;
      if (row.pending) return;
      // 1. Optimistic update, applied instantly.
      patch(shipment.id, {
        pending: action,
        error: undefined,
        conflict: undefined,
        isNew: false,
        hidden: action === "resolve",
        shipment: action === "escalate" ? { ...shipment, escalated: true } : shipment,
      });

      const res = await apiRequest<Shipment>(`/api/exceptions/${shipment.id}`, {
        method: "PATCH",
        body: { action, version: shipment.version },
      });

      if (res.ok) {
        settled.current.set(shipment.id, res.data.version);
        if (action === "resolve") {
          setRows((prev) => prev.filter((r) => r.shipment.id !== shipment.id));
          setResolvedCount((n) => n + 1);
          setNotice(`${shipment.id} resolved.`);
        } else {
          patch(shipment.id, { pending: undefined, shipment: res.data });
          setNotice(`${shipment.id} escalated.`);
        }
        return;
      }

      // 2a. Conflict: show the server's current record and let the user decide.
      const current = res.details?.current as Shipment | undefined;
      if (res.status === 409 && current) {
        settled.current.set(current.id, current.version);
        if (!isOpen(current)) {
          setRows((prev) => prev.filter((r) => r.shipment.id !== current.id));
          setNotice(`${current.id} was resolved by someone else, so your action was not applied.`);
        } else {
          patch(shipment.id, {
            pending: undefined,
            hidden: false,
            shipment: current,
            conflict: { message: res.message, action },
          });
        }
        return;
      }

      // 2b. Anything else: roll back visibly to exactly what was there before.
      patch(shipment.id, { pending: undefined, hidden: false, shipment, error: { message: res.message, action } });
    },
    [patch],
  );

  const dismiss = useCallback((id: string) => patch(id, { error: undefined, conflict: undefined }), [patch]);

  function showNew() {
    setRows((prev) => [...waiting.map((shipment): Row => ({ shipment, isNew: true })), ...prev]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function simulateTeammate() {
    setDemoBusy(true);
    poll.pauseFor(20_000); // hold polling so the on-screen copy goes stale and the conflict can be reproduced
    const res = await apiRequest<{ changed: string | null }>("/api/simulate/teammate", { method: "POST" });
    setNotice(
      !res.ok
        ? res.message
        : res.data.changed
          ? `Simulated teammate escalated ${res.data.changed}. Live updates paused for 20s: try acting on it.`
          : "Nothing to change.",
    );
    setDemoBusy(false);
  }

  return (
    <>
      <div className="queue-summary">
        <div>
          <span className="queue-summary-icon red">
            <AlertTriangle size={18} aria-hidden="true" />
          </span>
          <span>
            <small>Critical exceptions</small>
            <strong>{critical}</strong>
          </span>
        </div>
        <div>
          <span className="queue-summary-icon amber">
            <Clock3 size={18} aria-hidden="true" />
          </span>
          <span>
            <small>At risk</small>
            <strong>{atRisk}</strong>
          </span>
        </div>
        <div>
          <span className="queue-summary-icon green">
            <ShieldAlert size={18} aria-hidden="true" />
          </span>
          <span>
            <small>Resolved this session</small>
            <strong>{resolvedCount}</strong>
          </span>
        </div>
      </div>

      <div className="queue-heading">
        <div>
          <h2>
            Open issues <span>{visible.length}</span>
          </h2>
          <p role="status" className="poll-status" data-phase={poll.phase}>
            {poll.phase === "retrying" && `Connection problem. Retrying in ~${Math.round(poll.nextInMs / 1000)}s`}
            {poll.phase === "paused" && "Live updates paused"}
            {poll.phase === "live" &&
              (poll.lastOkAt
                ? `Live · checked ${formatTimeUtc(new Date(poll.lastOkAt).toISOString())}`
                : "Live · checking every few seconds")}
          </p>
        </div>
        <div className="queue-tools">
          {canAct && (
            <button type="button" className="button-secondary" onClick={simulateTeammate} disabled={demoBusy}>
              <Users size={14} aria-hidden="true" /> Demo: simulate teammate
            </button>
          )}
          <button type="button" className="button-secondary" onClick={poll.pollNow} disabled={poll.busy}>
            <RefreshCw size={14} aria-hidden="true" /> {poll.busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {!canAct && (
        <p className="viewer-note">
          You have view-only access. Switch to the Manager role (bottom of the sidebar) to resolve or escalate.
        </p>
      )}

      <p className="queue-notice" role="status" aria-live="polite">
        {notice}
      </p>

      {waiting.length > 0 && (
        <button type="button" className="new-pill" onClick={showNew}>
          {waiting.length} new {waiting.length === 1 ? "exception" : "exceptions"}. Show
        </button>
      )}

      <ul className="queue-list" aria-label="Open exceptions">
        {visible.map((row) => (
          <QueueCard key={row.shipment.id} row={row} canAct={canAct} onAction={runAction} onDismiss={dismiss} />
        ))}
      </ul>

      {visible.length === 0 && (
        <div className="empty-queue">
          <span>
            <Check size={23} aria-hidden="true" />
          </span>
          <h3>You&apos;re all caught up</h3>
          <p>No open shipment issues right now.</p>
        </div>
      )}
    </>
  );
}

const QueueCard = memo(function QueueCard({
  row,
  canAct,
  onAction,
  onDismiss,
}: {
  row: Row;
  canAct: boolean;
  onAction: (row: Row, action: ActionKind) => void;
  onDismiss: (id: string) => void;
}) {
  const { shipment: s, pending, error, conflict } = row;
  const busy = Boolean(pending);
  return (
    <li className="queue-card" data-new={row.isNew || undefined} aria-busy={busy}>
      <div className={`queue-severity ${s.status === "Exception" ? "sev-critical" : "sev-warning"}`} aria-hidden="true">
        {s.status === "Exception" ? <CircleAlert size={17} /> : <ShieldAlert size={17} />}
      </div>

      <div className="queue-main">
        <div className="queue-card-top">
          <StatusPill status={s.status} />
          {s.escalated && <span className="escalated-tag">Escalated</span>}
          {row.isNew && <span className="new-badge">New</span>}
          <span className="queue-card-time">
            Updated {formatTimeUtc(s.updated)} by {s.updatedBy}
          </span>
        </div>
        <h3>{s.exception || "Shipment running behind schedule"}</h3>
        <p>
          {s.id} <span>·</span> {s.customer} <span>·</span> {s.origin} <span>→</span> {s.destination}
        </p>
        <div className="queue-context">
          <span>
            <b>Carrier</b> {s.carrier}
          </span>
          <span>
            <b>Est. delivery</b> {formatDate(s.eta)}
          </span>
          <span>
            <b>Progress</b> {s.progress}%
          </span>
        </div>

        {error && (
          <div className="action-error" role="alert">
            <span>
              Couldn&apos;t {error.action} this shipment. Your change was rolled back. {error.message}
            </span>
            <span className="inline-actions">
              {canAct && (
                <button type="button" onClick={() => onAction(row, error.action)}>
                  Try again
                </button>
              )}
              <button type="button" onClick={() => onDismiss(s.id)}>
                Dismiss
              </button>
            </span>
          </div>
        )}

        {conflict && (
          <div className="conflict-box" role="alert">
            <strong>Edit conflict</strong>
            <span>{conflict.message} The card above now shows the latest version.</span>
            <span className="inline-actions">
              {canAct && (
                <button type="button" onClick={() => onAction(row, conflict.action)}>
                  {conflict.action === "resolve" ? "Resolve anyway" : "Escalate anyway"}
                </button>
              )}
              <button type="button" onClick={() => onDismiss(s.id)}>
                Keep their change
              </button>
            </span>
          </div>
        )}
      </div>

      <div className="queue-actions">
        <Link href={`/shipments/${s.id}`} className="queue-detail-link">
          Details <ArrowRight size={13} aria-hidden="true" />
        </Link>
        {canAct && (
          <>
            <button
              type="button"
              className="resolve-button"
              disabled={busy}
              onClick={() => onAction(row, "resolve")}
              aria-label={`Resolve ${s.id}`}
            >
              <Check size={14} aria-hidden="true" />
              {pending === "resolve" ? "Saving…" : "Resolve"}
            </button>
            <button
              type="button"
              className="escalate-button"
              disabled={busy || s.escalated}
              onClick={() => onAction(row, "escalate")}
              aria-label={`Escalate ${s.id}`}
            >
              {pending === "escalate" ? "Saving…" : s.escalated ? "Escalated" : "Escalate"}
            </button>
          </>
        )}
      </div>
    </li>
  );
});
