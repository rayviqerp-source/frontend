import { Suspense } from "react";
import { TicketDetailRoute } from "@/components/ticket/ticket-detail-route";
import { LoadingScreen } from "@/components/ui/states";

export default function AdminTicketDetailPage({
  params,
}: PageProps<"/admin/tickets/[id]">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading ticket…" />}>
      <TicketDetailRoute params={params} backHref="/admin/tickets" />
    </Suspense>
  );
}
