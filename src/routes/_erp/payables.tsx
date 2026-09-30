import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/payables")({
  head: () => ({ meta: [{ title: "Payables — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="payables" />,
});
