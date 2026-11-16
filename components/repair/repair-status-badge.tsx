import { Badge } from "@/components/ui/badge";
import { REPAIR_STATUS_LABELS, REPAIR_STATUS_TONES } from "@/lib/constants";
import type { RepairRequestStatus } from "@/lib/types";

/** Status pill for an inverter repair request. */
export function RepairStatusBadge({
  status,
  className,
}: {
  status: RepairRequestStatus;
  className?: string;
}) {
  return (
    <Badge tone={REPAIR_STATUS_TONES[status]} className={className} dot>
      {REPAIR_STATUS_LABELS[status]}
    </Badge>
  );
}
