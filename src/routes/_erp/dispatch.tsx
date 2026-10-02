import { createFileRoute } from "@tanstack/react-router";
import { DispatchPage } from "@/components/erp/pages/Operations";

export const Route = createFileRoute("/_erp/dispatch")({
  head: () => ({ meta: [{ title: "Dispatch — Selvantra Technologies" }, { name: "description", content: "Dispatch in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Dispatch — Selvantra Technologies" }, { property: "og:description", content: "Dispatch in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: DispatchPage,
});
