import { createFileRoute } from "@tanstack/react-router";
import { InvoicesPage } from "@/components/erp/pages/Invoices";

export const Route = createFileRoute("/_erp/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Selvantra Technologies" }] }),
  component: InvoicesPage,
});
