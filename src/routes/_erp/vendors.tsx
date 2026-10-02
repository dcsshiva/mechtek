import { createFileRoute } from "@tanstack/react-router";
import { VendorsPage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/vendors")({
  head: () => ({ meta: [{ title: "Vendors — Selvantra Technologies" }, { name: "description", content: "Vendors in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Vendors — Selvantra Technologies" }, { property: "og:description", content: "Vendors in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: VendorsPage,
});
