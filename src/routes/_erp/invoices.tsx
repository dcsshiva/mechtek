import { createFileRoute } from "@tanstack/react-router";
import { InvoicesPage } from "@/components/erp/pages/Invoices";

export const Route = createFileRoute("/_erp/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Selvantra Technologies" }, { name: "description", content: "Invoices in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Invoices — Selvantra Technologies" }, { property: "og:description", content: "Invoices in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: InvoicesPage,
});
