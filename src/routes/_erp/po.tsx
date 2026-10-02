import { createFileRoute } from "@tanstack/react-router";
import { PoPage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/po")({
  head: () => ({ meta: [{ title: "Purchase orders — Selvantra Technologies" }, { name: "description", content: "Purchase orders in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Purchase orders — Selvantra Technologies" }, { property: "og:description", content: "Purchase orders in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PoPage,
});
