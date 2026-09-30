import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/purchase")({
  head: () => ({ meta: [{ title: "Purchase overview — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="purchase" />,
});
