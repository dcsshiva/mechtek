import { createFileRoute } from "@tanstack/react-router";
import { MrPage } from "@/components/erp/pages/Stores";

export const Route = createFileRoute("/_erp/mr")({
  head: () => ({ meta: [{ title: "Material requisition — Selvantra Technologies" }, { name: "description", content: "Material requisition in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Material requisition — Selvantra Technologies" }, { property: "og:description", content: "Material requisition in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MrPage,
});
