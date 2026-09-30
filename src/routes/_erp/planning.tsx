import { createFileRoute } from "@tanstack/react-router";
import { PlanningPage } from "@/components/erp/pages/Stores";

export const Route = createFileRoute("/_erp/planning")({
  head: () => ({ meta: [{ title: "Procurement planning — MEK-SEL ERP" }] }),
  component: PlanningPage,
});
