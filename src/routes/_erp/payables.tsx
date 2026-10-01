import { createFileRoute } from "@tanstack/react-router";
import { PayablesPage } from "@/components/erp/pages/Finance";

export const Route = createFileRoute("/_erp/payables")({
  head: () => ({ meta: [{ title: "Payables — Selvantra Technologies" }] }),
  component: PayablesPage,
});
