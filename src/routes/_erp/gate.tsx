import { createFileRoute } from "@tanstack/react-router";
import { GatePage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/gate")({
  head: () => ({ meta: [{ title: "Gate pass — Selvantra Technologies" }, { name: "description", content: "Gate pass in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Gate pass — Selvantra Technologies" }, { property: "og:description", content: "Gate pass in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: GatePage,
});
