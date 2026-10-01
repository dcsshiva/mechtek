import { createFileRoute } from "@tanstack/react-router";
import { IndentPage } from "@/components/erp/pages/Purchase";

export const Route = createFileRoute("/_erp/indent")({
  head: () => ({ meta: [{ title: "Indents — Selvantra Technologies" }] }),
  component: IndentPage,
});
