import { createFileRoute } from "@tanstack/react-router";
import { MaterialsPage } from "@/components/erp/pages/Engineering";

export const Route = createFileRoute("/_erp/materials")({
  head: () => ({ meta: [{ title: "Raw material master — Selvantra Technologies" }, { name: "description", content: "Raw material master in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Raw material master — Selvantra Technologies" }, { property: "og:description", content: "Raw material master in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MaterialsPage,
});
