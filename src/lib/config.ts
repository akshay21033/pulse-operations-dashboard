function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const disabled = process.env.CHAOS_DISABLED === "1";

/**
 * Failure/latency injection knobs. Defaults match the assignment
 * (150-1500ms latency, ~3% read errors, ~8% write errors).
 * Set CHAOS_DISABLED=1 for tests, or override a single value, e.g.
 * CHAOS_READ_RATE=0.5 npm run dev to see failure states more often.
 */
export const chaosConfig = {
  minLatencyMs: disabled ? 0 : num("CHAOS_MIN_MS", 150),
  maxLatencyMs: disabled ? 0 : num("CHAOS_MAX_MS", 1500),
  readFailureRate: disabled ? 0 : num("CHAOS_READ_RATE", 0.03),
  writeFailureRate: disabled ? 0 : num("CHAOS_WRITE_RATE", 0.08),
  /** The carrier-history panel is a flaky "partner" API, so it fails more often. */
  carrierFailureRate: disabled ? 0 : num("CARRIER_FAIL_RATE", 0.15),
  carrierExtraDelayMs: disabled ? 0 : num("CARRIER_EXTRA_DELAY_MS", 1800),
  /** How often a simulated teammate / carrier feed changes data. */
  simulationIntervalMs: disabled ? 0 : num("SIM_INTERVAL_MS", 20_000),
};
