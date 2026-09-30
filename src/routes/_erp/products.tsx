import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/erp/pages/ComingSoon";

export const Route = createFileRoute("/_erp/products")({
  head: () => ({ meta: [{ title: "Product master — MEK-SEL ERP" }] }),
  component: () => <ComingSoon route="products" />,
});
