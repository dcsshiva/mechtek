import { createFileRoute } from "@tanstack/react-router";
import { PayablesPage } from "@/components/erp/pages/Finance";

export const Route = createFileRoute("/_erp/payables")({
  head: () => ({ meta: [{ title: "Payables — Selvantra Technologies" }, { name: "description", content: "Payables in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Payables — Selvantra Technologies" }, { property: "og:description", content: "Payables in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PayablesPage,
});
