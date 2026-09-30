import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/roles")({
  head: () => ({ meta: [{ title: "Role master — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="roles" />,
});
