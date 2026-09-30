import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/forecast")({
  head: () => ({ meta: [{ title: "Demand forecast — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="forecast" />,
});
