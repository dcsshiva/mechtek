import { createFileRoute } from "@tanstack/react-router";
import { DispatchPage } from "@/components/erp/pages/Operations";

export const Route = createFileRoute("/_erp/dispatch")({
  head: () => ({ meta: [{ title: "Dispatch — Selvantra Technologies" }] }),
  component: DispatchPage,
});
