import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/erp/pages/Dashboard";

export const Route = createFileRoute("/_erp/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Selvantra Technologies" }, { name: "description", content: "Dashboard in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Dashboard — Selvantra Technologies" }, { property: "og:description", content: "Dashboard in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: DashboardPage,
});
