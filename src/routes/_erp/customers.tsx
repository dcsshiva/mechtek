import { createFileRoute } from "@tanstack/react-router";
import { CustomersPage } from "@/components/erp/pages/Customers";

export const Route = createFileRoute("/_erp/customers")({
  head: () => ({ meta: [{ title: "Customers — MEK-SEL ERP" }] }),
  component: CustomersPage,
});
