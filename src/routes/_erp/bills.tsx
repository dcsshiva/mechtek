import { createFileRoute } from "@tanstack/react-router";
import { BillsPage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/bills")({
  head: () => ({ meta: [{ title: "Vendor bills — MEK-SEL ERP" }] }),
  component: BillsPage,
});
