import { createFileRoute } from "@tanstack/react-router";
import { RolesPage } from "@/components/erp/pages/Admin";

export const Route = createFileRoute("/_erp/roles")({
  head: () => ({ meta: [{ title: "Role master — Selvantra Technologies" }, { name: "description", content: "Role master in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Role master — Selvantra Technologies" }, { property: "og:description", content: "Role master in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: RolesPage,
});
