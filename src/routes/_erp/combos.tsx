import { createFileRoute } from "@tanstack/react-router";
import { CombosPage } from "@/components/erp/pages/Engineering";

export const Route = createFileRoute("/_erp/combos")({
  head: () => ({ meta: [{ title: "Combo sets — Selvantra Technologies" }, { name: "description", content: "Combo sets in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Combo sets — Selvantra Technologies" }, { property: "og:description", content: "Combo sets in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CombosPage,
});
