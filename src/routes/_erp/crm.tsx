import { createFileRoute } from "@tanstack/react-router";
import { CrmPage } from "@/components/erp/pages/Crm";

export const Route = createFileRoute("/_erp/crm")({
  head: () => ({ meta: [{ title: "CRM desk — Selvantra Technologies" }] }),
  component: CrmPage,
});
