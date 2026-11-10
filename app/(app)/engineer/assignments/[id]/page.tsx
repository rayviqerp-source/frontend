import { Suspense } from "react";
import { TicketDetailRoute } from "@/components/ticket/ticket-detail-route";
import { LoadingScreen } from "@/components/ui/states";

export default function EngineerAssignmentDetailPage({
  params,
}: PageProps<"/engineer/assignments/[id]">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading assignment…" />}>
      <TicketDetailRoute params={params} backHref="/engineer/assignments" />
    </Suspense>
  );
}
