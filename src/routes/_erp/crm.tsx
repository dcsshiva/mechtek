import { createFileRoute } from "@tanstack/react-router";
import { CrmPage } from "@/components/erp/pages/Crm";

export const Route = createFileRoute("/_erp/crm")({
  head: () => ({ meta: [{ title: "CRM desk — Selvantra Technologies" }, { name: "description", content: "CRM desk in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "CRM desk — Selvantra Technologies" }, { property: "og:description", content: "CRM desk in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CrmPage,
});
