import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/erp/pages/Operations";

export const Route = createFileRoute("/_erp/service")({
  head: () => ({ meta: [{ title: "Installed base & service — Selvantra Technologies" }, { name: "description", content: "Installed base & service in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Installed base & service — Selvantra Technologies" }, { property: "og:description", content: "Installed base & service in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ServicePage,
});
