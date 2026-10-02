import { createFileRoute } from "@tanstack/react-router";
import { CustomersPage } from "@/components/erp/pages/Customers";

export const Route = createFileRoute("/_erp/customers")({
  head: () => ({ meta: [{ title: "Customers — Selvantra Technologies" }, { name: "description", content: "Customers in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Customers — Selvantra Technologies" }, { property: "og:description", content: "Customers in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CustomersPage,
});
