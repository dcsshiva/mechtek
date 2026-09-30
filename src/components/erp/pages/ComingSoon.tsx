import { routeName, go } from "@/erp/nav";
import { PageHead } from "../ui";

/** Placeholder for screens that are being ported from the prototype in the next batch. */
export function ComingSoon({ route }: { route: string }) {
  const [, name] = routeName(route);
  return (
    <>
      <PageHead route={route} title={name} />
      <section className="card">
        <div className="empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 16px" }}>
          <h2 style={{ fontSize: 17 }}>{name} is coming in the next build batch</h2>
          <p className="muted" style={{ maxWidth: "52ch" }}>
            This screen is part of the MEK-SEL ERP prototype and is being rebuilt in this app. Its data is already loaded, so
            counts and alerts on other screens are live.
          </p>
          <button className="btn" onClick={() => go("dashboard")}>Back to dashboard</button>
        </div>
      </section>
    </>
  );
}
