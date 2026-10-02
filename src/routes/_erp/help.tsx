import { createFileRoute } from "@tanstack/react-router";
import { HelpPage } from "@/components/erp/pages/Help";

export const Route = createFileRoute("/_erp/help")({
  head: () => ({ meta: [{ title: "Help & guides — Selvantra Technologies" }, { name: "description", content: "Help & guides in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Help & guides — Selvantra Technologies" }, { property: "og:description", content: "Help & guides in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: HelpPage,
});
