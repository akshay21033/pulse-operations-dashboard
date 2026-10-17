export const STATUSES = ["In transit", "At risk", "Delivered", "Exception"] as const;
export type Status = (typeof STATUSES)[number];

export const REGIONS = ["Northeast", "Midwest", "South", "West"] as const;
export type Region = (typeof REGIONS)[number];

export type Role = "viewer" | "manager";
export type ActionKind = "resolve" | "escalate";

export type Shipment = {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  region: Region;
  status: Status;
  carrier: string;
  /** ISO timestamp of the estimated delivery. */
  eta: string;
  /** ISO timestamp of the last change. */
  updated: string;
  updatedBy: string;
  progress: number;
  value: number;
  exception?: string;
  escalated: boolean;
  /** Incremented on every write; used for optimistic concurrency. */
  version: number;
};

export type ShipmentFilters = {
  q?: string;
  status?: string;
  region?: string;
  /** yyyy-mm-dd, inclusive, compared against the ETA. */
  from?: string;
  to?: string;
};

export type ListQuery = ShipmentFilters & {
  sort?: string;
  direction?: string;
  cursor?: string;
  limit?: number;
};

export type ShipmentPage = {
  items: Shipment[];
  total: number;
  /** Zero-based index of the first returned item within the filtered, sorted set. */
  startIndex: number;
  nextCursor: string | null;
  prevCursor: string | null;
};

export type ExceptionFeed = {
  items: Shipment[];
  resolvedCount: number;
  serverTime: string;
};

export type Summary = {
  total: number;
  byStatus: Record<Status, number>;
  byRegion: Record<Region, number>;
  open: Shipment[];
  openCount: number;
  recent: Shipment[];
  resolvedCount: number;
  serverTime: string;
};

export type CarrierEvent = {
  id: string;
  title: string;
  detail: string;
  at: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  shipmentId: string;
  action: ActionKind;
  actor: string;
};

/** Result type shared by the server and client API helpers. Never throws. */
export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string; details?: Record<string, unknown> };
