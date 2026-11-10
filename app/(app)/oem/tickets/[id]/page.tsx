import { Suspense } from "react";
import { TicketDetailRoute } from "@/components/ticket/ticket-detail-route";
import { LoadingScreen } from "@/components/ui/states";

export default function OemTicketDetailPage({
  params,
}: PageProps<"/oem/tickets/[id]">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading ticket…" />}>
      <TicketDetailRoute params={params} backHref="/oem/tickets" />
    </Suspense>
  );
}
