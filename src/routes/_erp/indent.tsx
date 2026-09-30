import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/indent")({
  head: () => ({ meta: [{ title: "Indents — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="indent" />,
});
