import { createFileRoute } from "@tanstack/react-router";
import { PurchasePage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/purchase")({
  head: () => ({ meta: [{ title: "Purchase overview — Selvantra Technologies" }, { name: "description", content: "Purchase overview in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Purchase overview — Selvantra Technologies" }, { property: "og:description", content: "Purchase overview in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PurchasePage,
});
