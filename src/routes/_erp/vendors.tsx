import { createFileRoute } from "@tanstack/react-router";
import { VendorsPage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/vendors")({
  head: () => ({ meta: [{ title: "Vendors — MEK-SEL ERP" }] }),
  component: VendorsPage,
});
