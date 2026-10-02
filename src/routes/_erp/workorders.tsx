import { createFileRoute } from "@tanstack/react-router";
import { WorkOrdersPage } from "@/components/erp/pages/Operations";

export const Route = createFileRoute("/_erp/workorders")({
  head: () => ({ meta: [{ title: "Work orders — Selvantra Technologies" }, { name: "description", content: "Work orders in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Work orders — Selvantra Technologies" }, { property: "og:description", content: "Work orders in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WorkOrdersPage,
});
