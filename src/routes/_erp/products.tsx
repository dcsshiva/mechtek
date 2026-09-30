import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/erp/pages/Engineering";

export const Route = createFileRoute("/_erp/products")({
  head: () => ({ meta: [{ title: "Product master — MEK-SEL ERP" }] }),
  component: ProductsPage,
});
