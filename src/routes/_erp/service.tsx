import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/erp/pages/Operations";

export const Route = createFileRoute("/_erp/service")({
  head: () => ({ meta: [{ title: "Installed base & service — MEK-SEL ERP" }] }),
  component: ServicePage,
});
