import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/receivables")({
  head: () => ({ meta: [{ title: "Receivables — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="receivables" />,
});
