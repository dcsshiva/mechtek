import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/vendors")({
  head: () => ({ meta: [{ title: "Vendors — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="vendors" />,
});
