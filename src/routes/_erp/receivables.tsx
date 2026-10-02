import { createFileRoute } from "@tanstack/react-router";
import { ReceivablesPage } from "@/components/erp/pages/Finance";

export const Route = createFileRoute("/_erp/receivables")({
  head: () => ({ meta: [{ title: "Receivables — Selvantra Technologies" }, { name: "description", content: "Receivables in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Receivables — Selvantra Technologies" }, { property: "og:description", content: "Receivables in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ReceivablesPage,
});
