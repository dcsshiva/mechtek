import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/help")({
  head: () => ({ meta: [{ title: "Help & guides — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="help" />,
});
