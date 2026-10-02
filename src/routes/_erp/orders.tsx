import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/erp/pages/Orders";

export const Route = createFileRoute("/_erp/orders")({
  head: () => ({ meta: [{ title: "Sales orders — Selvantra Technologies" }, { name: "description", content: "Sales orders in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Sales orders — Selvantra Technologies" }, { property: "og:description", content: "Sales orders in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: OrdersPage,
});
