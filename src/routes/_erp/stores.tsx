import { createFileRoute } from "@tanstack/react-router";
import { StoresPage } from "@/components/erp/pages/Stores";

export const Route = createFileRoute("/_erp/stores")({
  head: () => ({ meta: [{ title: "Stores desk — Selvantra Technologies" }] }),
  component: StoresPage,
});
