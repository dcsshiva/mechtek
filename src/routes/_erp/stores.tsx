import { createFileRoute } from "@tanstack/react-router";
import { StoresPage } from "@/components/erp/pages/Stores";

export const Route = createFileRoute("/_erp/stores")({
  head: () => ({ meta: [{ title: "Stores desk — Selvantra Technologies" }, { name: "description", content: "Stores desk in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Stores desk — Selvantra Technologies" }, { property: "og:description", content: "Stores desk in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: StoresPage,
});
