import { createFileRoute } from "@tanstack/react-router";
import { IndentPage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/indent")({
  head: () => ({ meta: [{ title: "Indents — Selvantra Technologies" }, { name: "description", content: "Indents in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Indents — Selvantra Technologies" }, { property: "og:description", content: "Indents in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: IndentPage,
});
