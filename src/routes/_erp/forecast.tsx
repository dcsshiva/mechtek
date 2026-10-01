import { createFileRoute } from "@tanstack/react-router";
import { ForecastPage } from "@/components/erp/pages/Forecast";

export const Route = createFileRoute("/_erp/forecast")({
  head: () => ({ meta: [{ title: "Demand forecast — Selvantra Technologies" }] }),
  component: ForecastPage,
});
