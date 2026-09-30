import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/inventory")({
  head: () => ({ meta: [{ title: "Inventory — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="inventory" />,
});
