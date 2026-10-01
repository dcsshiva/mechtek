import { createFileRoute } from "@tanstack/react-router";
import { InventoryPage } from "@/components/erp/pages/Stores";

export const Route = createFileRoute("/_erp/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Selvantra Technologies" }] }),
  component: InventoryPage,
});
