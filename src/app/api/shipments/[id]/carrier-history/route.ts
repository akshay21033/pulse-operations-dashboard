import { sleep } from "@/lib/chaos";
import { chaosConfig } from "@/lib/config";
import { ApiError } from "@/lib/errors";
import { apiRoute } from "@/lib/route";
import { carrierHistory, getShipment } from "@/lib/store";

/** Deliberately slow and flakier than the rest: it models a third-party carrier API. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return apiRoute({ kind: "read" }, async () => {
    await sleep(chaosConfig.carrierExtraDelayMs);
    const shipment = getShipment(id);
    if (!shipment) throw new ApiError(404, "Shipment not found.");
    if (Math.random() < chaosConfig.carrierFailureRate) {
      throw new ApiError(502, "The carrier's tracking service timed out.");
    }
    return { events: carrierHistory(shipment) };
  });
}
