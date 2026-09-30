import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/mrp")({
  head: () => ({ meta: [{ title: "Material planning — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="mrp" />,
});
