import { createFileRoute } from "@tanstack/react-router";
import { PlanningPage } from "@/components/erp/pages/Stores";

export const Route = createFileRoute("/_erp/planning")({
  head: () => ({ meta: [{ title: "Procurement planning — Selvantra Technologies" }, { name: "description", content: "Procurement planning in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Procurement planning — Selvantra Technologies" }, { property: "og:description", content: "Procurement planning in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PlanningPage,
});
