import { createFileRoute } from "@tanstack/react-router";
import { LeadsPage } from "@/components/erp/pages/Leads";

export const Route = createFileRoute("/_erp/leads")({
  head: () => ({ meta: [{ title: "Leads — MEK-SEL ERP" }] }),
  component: LeadsPage,
});
