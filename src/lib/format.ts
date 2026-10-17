import type { Status } from "./types";

// Everything is formatted in UTC so server- and client-rendered output match
// (no hydration mismatches) and ETAs never shift a day with the viewer's timezone.
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(iso).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

export function formatTimeUtc(iso: string) {
  return `${new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" })} UTC`;
}

export function relativeTime(iso: string, now: string) {
  const minutes = Math.max(0, Math.round((Date.parse(now) - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

export const statusClass = (status: Status) => status.toLowerCase().replace(" ", "-");
