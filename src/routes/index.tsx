import { createFileRoute, redirect } from "@tanstack/react-router";

// The app starts at the dashboard; the layout sends signed-out users to /login.
export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
