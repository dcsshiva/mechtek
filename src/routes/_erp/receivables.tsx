import { createFileRoute } from "@tanstack/react-router";
import { ReceivablesPage } from "@/components/erp/pages/Finance";

export const Route = createFileRoute("/_erp/receivables")({
  head: () => ({ meta: [{ title: "Receivables — Selvantra Technologies" }] }),
  component: ReceivablesPage,
});
