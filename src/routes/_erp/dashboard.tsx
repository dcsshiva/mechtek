import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/erp/pages/Dashboard";

export const Route = createFileRoute("/_erp/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MEK-SEL ERP" }] }),
  component: DashboardPage,
});
