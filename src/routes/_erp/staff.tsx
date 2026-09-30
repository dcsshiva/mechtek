import { createFileRoute } from "@tanstack/react-router";
import { StaffPage } from "@/components/erp/pages/Admin";

export const Route = createFileRoute("/_erp/staff")({
  head: () => ({ meta: [{ title: "Staff master — MEK-SEL ERP" }] }),
  component: StaffPage,
});
