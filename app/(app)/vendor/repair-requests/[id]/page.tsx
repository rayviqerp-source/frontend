import { Suspense } from "react";
import { RepairRequestDetail } from "@/components/repair/repair-request-detail";
import { LoadingScreen } from "@/components/ui/states";

export default function VendorRepairRequestDetailPage({
  params,
}: PageProps<"/vendor/repair-requests/[id]">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading request…" />}>
      <RepairRequestDetail params={params} mode="company" backHref="/vendor/repair-requests" />
    </Suspense>
  );
}
