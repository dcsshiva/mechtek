import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/bills")({
  head: () => ({ meta: [{ title: "Vendor bills — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="bills" />,
});
