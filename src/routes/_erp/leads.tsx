import { createFileRoute } from "@tanstack/react-router";
import { LeadsPage } from "@/components/erp/pages/Leads";

export const Route = createFileRoute("/_erp/leads")({
  head: () => ({ meta: [{ title: "Leads — Selvantra Technologies" }, { name: "description", content: "Leads in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Leads — Selvantra Technologies" }, { property: "og:description", content: "Leads in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: LeadsPage,
});
