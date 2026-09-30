import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/workorders")({
  head: () => ({ meta: [{ title: "Work orders — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="workorders" />,
});
