import { createFileRoute } from "@tanstack/react-router";
import { BomPage } from "@/components/erp/pages/Engineering";

export const Route = createFileRoute("/_erp/bom")({
  head: () => ({ meta: [{ title: "Bill of materials — Selvantra Technologies" }, { name: "description", content: "Bill of materials in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Bill of materials — Selvantra Technologies" }, { property: "og:description", content: "Bill of materials in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BomPage,
});
