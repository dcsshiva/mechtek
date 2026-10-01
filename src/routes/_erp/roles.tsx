import { createFileRoute } from "@tanstack/react-router";
import { RolesPage } from "@/components/erp/pages/Admin";

export const Route = createFileRoute("/_erp/roles")({
  head: () => ({ meta: [{ title: "Role master — Selvantra Technologies" }] }),
  component: RolesPage,
});
