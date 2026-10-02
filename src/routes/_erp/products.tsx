import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/erp/pages/Engineering";

export const Route = createFileRoute("/_erp/products")({
  head: () => ({ meta: [{ title: "Product master — Selvantra Technologies" }, { name: "description", content: "Product master in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Product master — Selvantra Technologies" }, { property: "og:description", content: "Product master in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ProductsPage,
});
