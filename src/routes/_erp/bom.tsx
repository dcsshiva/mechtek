import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/bom")({
  head: () => ({ meta: [{ title: "Bill of materials — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="bom" />,
});
