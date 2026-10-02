import { createFileRoute } from "@tanstack/react-router";
import { StaffPage } from "@/components/erp/pages/Admin";

export const Route = createFileRoute("/_erp/staff")({
  head: () => ({ meta: [{ title: "Staff master — Selvantra Technologies" }, { name: "description", content: "Staff master in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Staff master — Selvantra Technologies" }, { property: "og:description", content: "Staff master in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: StaffPage,
});
