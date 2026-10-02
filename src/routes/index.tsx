import { createFileRoute, redirect } from "@tanstack/react-router";

// The app starts at the dashboard; the layout sends signed-out users to /login.
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Mechtek workspace — Selvantra Technologies" }, { name: "description", content: "Open the Mechtek operations workspace for your role." }, { property: "og:title", content: "Mechtek workspace — Selvantra Technologies" }, { property: "og:description", content: "Open the Mechtek operations workspace for your role." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
