import { chaosConfig } from "./config";
import { ApiError } from "./errors";

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function randomLatency(): number {
  const { minLatencyMs, maxLatencyMs } = chaosConfig;
  return minLatencyMs + Math.random() * (maxLatencyMs - minLatencyMs);
}

/** Wait a random amount, then maybe fail, to make the mock API behave like a flaky real one. */
export async function simulateNetwork(kind: "read" | "write"): Promise<void> {
  await sleep(randomLatency());
  const rate = kind === "read" ? chaosConfig.readFailureRate : chaosConfig.writeFailureRate;
  if (Math.random() < rate) {
    throw new ApiError(
      500,
      kind === "read"
        ? "The operations service is temporarily unavailable."
        : "The action could not be saved. Please try again.",
    );
  }
}
