"use client";

import { use } from "react";
import { TicketDetail } from "./ticket-detail";

/** Reads the dynamic `params` promise in the client and renders the detail view. */
export function TicketDetailRoute({
  params,
  backHref,
}: {
  params: Promise<{ id: string }>;
  backHref: string;
}) {
  const { id } = use(params);
  return <TicketDetail ticketId={id} backHref={backHref} />;
}
