import { ApiError } from "@/lib/errors";
import { apiRoute } from "@/lib/route";
import { getShipment } from "@/lib/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return apiRoute({ kind: "read" }, () => {
    const shipment = getShipment(id);
    if (!shipment) throw new ApiError(404, "Shipment not found.");
    return shipment;
  });
}
