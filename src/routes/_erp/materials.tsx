import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/materials")({
  head: () => ({ meta: [{ title: "Raw material master — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="materials" />,
});
