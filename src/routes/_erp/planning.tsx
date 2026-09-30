import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/planning")({
  head: () => ({ meta: [{ title: "Procurement planning — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="planning" />,
});
