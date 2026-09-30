import { createFileRoute } from "@tanstack/react-router";
import { GatePage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/gate")({
  head: () => ({ meta: [{ title: "Gate pass — MEK-SEL ERP" }] }),
  component: GatePage,
});
