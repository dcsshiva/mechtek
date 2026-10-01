import { createFileRoute } from "@tanstack/react-router";
import { MrpPage } from "@/components/erp/pages/Operations";

export const Route = createFileRoute("/_erp/mrp")({
  head: () => ({ meta: [{ title: "Material planning — Selvantra Technologies" }] }),
  component: MrpPage,
});
