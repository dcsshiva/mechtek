import { createFileRoute } from "@tanstack/react-router";
import { PoPage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/po")({
  head: () => ({ meta: [{ title: "Purchase orders — Selvantra Technologies" }] }),
  component: PoPage,
});
