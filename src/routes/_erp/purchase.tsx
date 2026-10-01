import { createFileRoute } from "@tanstack/react-router";
import { PurchasePage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/purchase")({
  head: () => ({ meta: [{ title: "Purchase overview — Selvantra Technologies" }] }),
  component: PurchasePage,
});
