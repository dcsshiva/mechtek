import { createFileRoute } from "@tanstack/react-router";
import { CombosPage } from "@/components/erp/pages/Engineering";

export const Route = createFileRoute("/_erp/combos")({
  head: () => ({ meta: [{ title: "Combo sets — Selvantra Technologies" }] }),
  component: CombosPage,
});
