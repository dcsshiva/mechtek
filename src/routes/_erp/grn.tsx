import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/grn")({
  head: () => ({ meta: [{ title: "Goods receipt (GRN) — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="grn" />,
});
