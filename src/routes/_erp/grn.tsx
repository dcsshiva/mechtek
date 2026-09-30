import { createFileRoute } from "@tanstack/react-router";
import { GrnPage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/grn")({
  head: () => ({ meta: [{ title: "Goods receipt (GRN) — MEK-SEL ERP" }] }),
  component: GrnPage,
});
