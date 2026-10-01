import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/erp/pages/Orders";

export const Route = createFileRoute("/_erp/orders")({
  head: () => ({ meta: [{ title: "Sales orders — Selvantra Technologies" }] }),
  component: OrdersPage,
});
