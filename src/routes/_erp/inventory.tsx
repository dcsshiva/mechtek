import { createFileRoute } from "@tanstack/react-router";
import { InventoryPage } from "@/components/erp/pages/Stores";

export const Route = createFileRoute("/_erp/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Selvantra Technologies" }, { name: "description", content: "Inventory in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Inventory — Selvantra Technologies" }, { property: "og:description", content: "Inventory in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: InventoryPage,
});
