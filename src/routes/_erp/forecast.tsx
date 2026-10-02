import { createFileRoute } from "@tanstack/react-router";
import { ForecastPage } from "@/components/erp/pages/Forecast";

export const Route = createFileRoute("/_erp/forecast")({
  head: () => ({ meta: [{ title: "Demand forecast — Selvantra Technologies" }, { name: "description", content: "Demand forecast in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:title", content: "Demand forecast — Selvantra Technologies" }, { property: "og:description", content: "Demand forecast in the Mechtek operations workspace by Selvantra Technologies." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ForecastPage,
});
