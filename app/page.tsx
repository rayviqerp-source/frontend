import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";

export const metadata: Metadata = {
  title: "Find a verified solar inverter repair expert",
  description:
    "Browse every verified solar inverter repair and service professional on the RAYVIQ network — ratings, certifications, live availability and OEM service history.",
};

/**
 * Public landing page. Lists the whole engineer network without requiring a
 * login, and routes visitors into the marketplace profile + booking flow.
 */
export default function Home() {
  return <HomePage />;
}
