import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/po")({
  head: () => ({ meta: [{ title: "Purchase orders — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="po" />,
});
