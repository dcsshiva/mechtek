import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/mr")({
  head: () => ({ meta: [{ title: "Material requisition — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="mr" />,
});
