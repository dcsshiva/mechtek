import { createFileRoute } from "@tanstack/react-router";
import { BillsPage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/bills")({
  head: () => ({ meta: [{ title: "Vendor bills — Selvantra Technologies" }, { name: "description", content: "Vendor bills in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Vendor bills — Selvantra Technologies" }, { property: "og:description", content: "Vendor bills in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BillsPage,
});
