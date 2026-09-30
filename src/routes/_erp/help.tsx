import { createFileRoute } from "@tanstack/react-router";
import { HelpPage } from "@/components/erp/pages/Help";

export const Route = createFileRoute("/_erp/help")({
  head: () => ({ meta: [{ title: "Help & guides — MEK-SEL ERP" }] }),
  component: HelpPage,
});
