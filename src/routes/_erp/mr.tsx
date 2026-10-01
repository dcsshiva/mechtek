import { createFileRoute } from "@tanstack/react-router";
import { MrPage } from "@/components/erp/pages/Stores";

export const Route = createFileRoute("/_erp/mr")({
  head: () => ({ meta: [{ title: "Material requisition — Selvantra Technologies" }] }),
  component: MrPage,
});
