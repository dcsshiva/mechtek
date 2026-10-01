import { createFileRoute } from "@tanstack/react-router";
import { QuotesPage } from "@/components/erp/pages/Quotes";

export const Route = createFileRoute("/_erp/quotes")({
  head: () => ({ meta: [{ title: "Quotations — Selvantra Technologies" }] }),
  component: QuotesPage,
});
