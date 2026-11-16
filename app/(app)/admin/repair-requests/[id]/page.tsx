import { Suspense } from "react";
import { RepairRequestDetail } from "@/components/repair/repair-request-detail";
import { LoadingScreen } from "@/components/ui/states";

export default function AdminRepairRequestDetailPage({
  params,
}: PageProps<"/admin/repair-requests/[id]">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading request…" />}>
      <RepairRequestDetail params={params} mode="admin" backHref="/admin/repair-requests" />
    </Suspense>
  );
}
