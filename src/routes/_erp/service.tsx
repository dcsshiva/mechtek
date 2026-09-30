import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/service")({
  head: () => ({ meta: [{ title: "Installed base & service — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="service" />,
});
