import { createFileRoute } from "@tanstack/react-router";
import { BomPage } from "@/components/erp/pages/Engineering";

export const Route = createFileRoute("/_erp/bom")({
  head: () => ({ meta: [{ title: "Bill of materials — MEK-SEL ERP" }] }),
  component: BomPage,
});
