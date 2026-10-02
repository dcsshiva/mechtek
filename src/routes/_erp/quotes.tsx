import { createFileRoute } from "@tanstack/react-router";
import { QuotesPage } from "@/components/erp/pages/Quotes";

export const Route = createFileRoute("/_erp/quotes")({
  head: () => ({ meta: [{ title: "Quotations — Selvantra Technologies" }, { name: "description", content: "Quotations in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Quotations — Selvantra Technologies" }, { property: "og:description", content: "Quotations in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: QuotesPage,
});
