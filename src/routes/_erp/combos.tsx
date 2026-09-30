import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/combos")({
  head: () => ({ meta: [{ title: "Combo sets — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="combos" />,
});
