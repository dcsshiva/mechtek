import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/erp/AppShell";
import { SESSION } from "@/erp/engine";
import { restoreSession, canSee } from "@/erp/session";

// Signed-in layout: top bar, role-based sidebar and the page. Client-only (demo data lives in the browser).
export const Route = createFileRoute("/_erp")({
  ssr: false,
  beforeLoad: ({ location }) => {
    restoreSession();
    if (!SESSION.user) throw redirect({ to: "/login" });
    const key = location.pathname.replace(/^\//, "");
    if (key && key !== "dashboard" && !canSee(key)) throw redirect({ to: "/dashboard" });
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
