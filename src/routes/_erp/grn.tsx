import { createFileRoute } from "@tanstack/react-router";
import { GrnPage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/grn")({
  head: () => ({ meta: [{ title: "Goods receipt (GRN) — Selvantra Technologies" }, { name: "description", content: "Goods receipt (GRN) in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Goods receipt (GRN) — Selvantra Technologies" }, { property: "og:description", content: "Goods receipt (GRN) in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: GrnPage,
});
