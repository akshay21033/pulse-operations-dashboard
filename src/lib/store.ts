import { chaosConfig } from "./config";
import { ApiError } from "./errors";
import { createSeed, EXCEPTION_REASONS } from "./seed";
import { REGIONS, STATUSES } from "./types";
import type { ActionKind, AuditEntry, CarrierEvent, ExceptionFeed, Region, Shipment, Status, Summary } from "./types";

type Store = {
  shipments: Shipment[];
  audit: AuditEntry[];
  resolvedCount: number;
  lastSimulationAt: number;
};

// Route handlers can be bundled separately, so the singleton lives on globalThis
// (this also survives hot reloads in dev).
const globalStore = globalThis as typeof globalThis & { __pulseStore?: Store };

function store(): Store {
  if (!globalStore.__pulseStore) {
    const now = Date.now();
    globalStore.__pulseStore = {
      shipments: createSeed(now),
      audit: [],
      resolvedCount: 0,
      lastSimulationAt: now,
    };
  }
  return globalStore.__pulseStore;
}

export const isOpen = (s: Shipment) => s.status === "Exception" || s.status === "At risk";

/** Exceptions first, then newest change first. */
function byUrgency(a: Shipment, b: Shipment) {
  return Number(b.status === "Exception") - Number(a.status === "Exception") || b.updated.localeCompare(a.updated);
}

export function allShipments(): readonly Shipment[] {
  return store().shipments;
}

export function getShipment(id: string): Shipment | undefined {
  return store().shipments.find((s) => s.id === id);
}

export function listOpenShipments(): Shipment[] {
  return store().shipments.filter(isOpen).sort(byUrgency);
}

export function exceptionFeed(): ExceptionFeed {
  maybeSimulateTeammate();
  return {
    items: listOpenShipments(),
    resolvedCount: store().resolvedCount,
    serverTime: new Date().toISOString(),
  };
}

export function summarize(): Summary {
  maybeSimulateTeammate();
  const { shipments, resolvedCount } = store();
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  const byRegion = Object.fromEntries(REGIONS.map((r) => [r, 0])) as Record<Region, number>;
  for (const s of shipments) {
    byStatus[s.status] += 1;
    byRegion[s.region] += 1;
  }
  const open = listOpenShipments();
  return {
    total: shipments.length,
    byStatus,
    byRegion,
    open: open.slice(0, 4),
    openCount: open.length,
    recent: [...shipments].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 6),
    resolvedCount,
    serverTime: new Date().toISOString(),
  };
}

export function getAudit(): AuditEntry[] {
  return [...store().audit].reverse();
}

/**
 * Apply an operator action with optimistic concurrency: the caller must send the
 * version it last saw. If somebody else changed the record, nothing is written
 * and a 409 carrying the current record is returned so the UI can resolve it.
 */
export function applyAction(id: string, action: unknown, version: unknown, actor: string): Shipment {
  if (action !== "resolve" && action !== "escalate") throw new ApiError(400, "Unknown action.");
  if (typeof version !== "number") throw new ApiError(400, "A version number is required.");
  const s = store();
  const shipment = s.shipments.find((x) => x.id === id);
  if (!shipment) throw new ApiError(404, "Shipment not found.");

  if (shipment.version !== version) {
    throw new ApiError(
      409,
      `${shipment.updatedBy} changed this shipment while you were working. Review the latest state before retrying.`,
      { current: { ...shipment } },
    );
  }

  if (action === "resolve") {
    shipment.status = "In transit";
    shipment.exception = undefined;
    shipment.escalated = false;
    s.resolvedCount += 1;
  } else {
    shipment.escalated = true;
  }
  shipment.version += 1;
  shipment.updated = new Date().toISOString();
  shipment.updatedBy = actor;
  s.audit.push({
    id: `A-${String(s.audit.length + 1).padStart(4, "0")}`,
    at: shipment.updated,
    shipmentId: id,
    action: action as ActionKind,
    actor,
  });
  return { ...shipment };
}

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/** A second "user": a teammate escalates an open item, bumping its version. */
export function simulateTeammateEdit(): Shipment | null {
  const candidates = store().shipments.filter((s) => isOpen(s) && !s.escalated);
  if (candidates.length === 0) return null;
  const target = pick(candidates);
  target.escalated = true;
  target.version += 1;
  target.updated = new Date().toISOString();
  target.updatedBy = "m.chen (simulated)";
  return { ...target };
}

/** Lazily simulate background activity: a carrier feed flags a new exception and a teammate acts. */
function maybeSimulateTeammate(now = Date.now()) {
  const s = store();
  const interval = chaosConfig.simulationIntervalMs;
  if (interval <= 0 || now - s.lastSimulationAt < interval) return;
  s.lastSimulationAt = now;

  const target = pick(s.shipments.filter((x) => x.status === "In transit"));
  if (target) {
    target.status = "Exception";
    target.exception = pick(EXCEPTION_REASONS);
    target.escalated = false;
    target.version += 1;
    target.updated = new Date(now).toISOString();
    target.updatedBy = "carrier feed";
  }
  if (Math.random() < 0.35) simulateTeammateEdit();
}

/** Deterministic mock partner history for the slow secondary panel. */
export function carrierHistory(shipment: Shipment): CarrierEvent[] {
  const base = Date.parse(shipment.updated);
  const hour = 3_600_000;
  const events: CarrierEvent[] = [
    {
      id: "scan-hub",
      title: "Scanned at regional hub",
      detail: `${shipment.carrier} · ${shipment.destination} hub`,
      at: new Date(base).toISOString(),
    },
    {
      id: "depart",
      title: "Departed origin facility",
      detail: `Left ${shipment.origin} distribution center`,
      at: new Date(base - 9 * hour).toISOString(),
    },
    {
      id: "pickup",
      title: "Picked up by carrier",
      detail: `Collected by ${shipment.carrier}`,
      at: new Date(base - 26 * hour).toISOString(),
    },
  ];
  if (shipment.exception) {
    events.unshift({
      id: "exception",
      title: shipment.exception,
      detail: "Carrier reported a delay on this leg",
      at: new Date(base + hour).toISOString(),
    });
  }
  return events;
}
