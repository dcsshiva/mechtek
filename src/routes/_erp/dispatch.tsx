import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/dispatch")({
  head: () => ({ meta: [{ title: "Dispatch — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="dispatch" />,
});
