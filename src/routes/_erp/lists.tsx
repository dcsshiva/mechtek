import { createFileRoute } from "@tanstack/react-router";
import { ListsPage } from "@/components/erp/pages/Lists";

export const Route = createFileRoute("/_erp/lists")({
  head: () => ({ meta: [{ title: "Lists & settings — Selvantra Technologies" }, { name: "description", content: "Lists & settings in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Lists & settings — Selvantra Technologies" }, { property: "og:description", content: "Lists & settings in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ListsPage,
});
