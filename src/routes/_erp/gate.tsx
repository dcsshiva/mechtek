import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/gate")({
  head: () => ({ meta: [{ title: "Gate pass — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="gate" />,
});
