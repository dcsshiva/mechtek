import { createFileRoute } from "@tanstack/react-router";
import { MaterialsPage } from "@/components/erp/pages/Engineering";

export const Route = createFileRoute("/_erp/materials")({
  head: () => ({ meta: [{ title: "Raw material master — Selvantra Technologies" }] }),
  component: MaterialsPage,
});
