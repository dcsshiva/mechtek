import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/staff")({
  head: () => ({ meta: [{ title: "Staff master — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="staff" />,
});
