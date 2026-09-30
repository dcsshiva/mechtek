import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/stores")({
  head: () => ({ meta: [{ title: "Stores desk — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="stores" />,
});
