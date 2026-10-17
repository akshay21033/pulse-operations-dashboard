import type { Region, Shipment, Status } from "./types";

const customers = [
  "Northstar Goods",
  "Field & Form",
  "Morrow Supply",
  "Common House",
  "Arc Studio",
  "Goodwell Market",
  "Sunday Supply",
  "Kinfolk Co.",
  "Evergreen Labs",
  "Atlas Outfitters",
];
const lanes: Array<[string, string, Region]> = [
  ["New York", "Chicago", "Northeast"],
  ["Los Angeles", "Phoenix", "West"],
  ["Dallas", "Atlanta", "South"],
  ["Seattle", "Denver", "West"],
  ["Boston", "Philadelphia", "Northeast"],
  ["Miami", "Nashville", "South"],
  ["Portland", "San Francisco", "West"],
  ["Columbus", "Detroit", "Midwest"],
];
const carriers = ["Maersk", "FedEx Freight", "DHL Express", "UPS Supply Chain", "XPO Logistics"];
export const EXCEPTION_REASONS = [
  "Weather delay",
  "Address verification",
  "Customs hold",
  "Missed connection",
  "Damaged in transit",
];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function statusFor(i: number): Status {
  if (i % 67 === 0) return "Exception";
  if (i % 23 === 0) return "At risk";
  if (i % 4 === 0) return "Delivered";
  return "In transit";
}

/** Deterministic dataset, anchored to `now` so ETAs are always in the near future. */
export function createSeed(now: number, count = 1200): Shipment[] {
  const startOfToday = Math.floor(now / DAY) * DAY;
  return Array.from({ length: count }, (_, i) => {
    const [origin, destination, region] = lanes[i % lanes.length];
    const status = statusFor(i);
    return {
      id: `PLS-${String(4821 + i).padStart(6, "0")}`,
      customer: customers[(i * 3) % customers.length],
      origin,
      destination,
      region,
      status,
      carrier: carriers[i % carriers.length],
      eta: new Date(startOfToday + (((i * 7) % 30) + 1) * DAY).toISOString(),
      updated: new Date(now - (i % 18) * HOUR).toISOString(),
      updatedBy: "carrier feed",
      progress: status === "Delivered" ? 100 : Math.min(96, 15 + ((i * 13) % 80)),
      value: 1800 + ((i * 317) % 42_800),
      exception: status === "Exception" ? EXCEPTION_REASONS[i % EXCEPTION_REASONS.length] : undefined,
      escalated: false,
      version: 1,
    };
  });
}
