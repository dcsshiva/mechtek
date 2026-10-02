import { createFileRoute } from "@tanstack/react-router";
import { MrpPage } from "@/components/erp/pages/Operations";

export const Route = createFileRoute("/_erp/mrp")({
  head: () => ({ meta: [{ title: "Material planning — Selvantra Technologies" }, { name: "description", content: "Material planning in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Material planning — Selvantra Technologies" }, { property: "og:description", content: "Material planning in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MrpPage,
});
