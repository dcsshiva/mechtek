import { createFileRoute } from "@tanstack/react-router";
import { ListsPage } from "@/components/erp/pages/Lists";

export const Route = createFileRoute("/_erp/lists")({
  head: () => ({ meta: [{ title: "Lists & settings — MEK-SEL ERP" }] }),
  component: ListsPage,
});
