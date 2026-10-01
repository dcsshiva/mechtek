import { createFileRoute } from "@tanstack/react-router";
import { WorkOrdersPage } from "@/components/erp/pages/Operations";

export const Route = createFileRoute("/_erp/workorders")({
  head: () => ({ meta: [{ title: "Work orders — Selvantra Technologies" }] }),
  component: WorkOrdersPage,
});
