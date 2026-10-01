import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Icon } from "./Icon";
import { ModalHost, closeModal, toast } from "./ui";
import { ROUTES, navCount, setNavigator } from "@/erp/nav";
import { canSee, me, signOut } from "@/erp/session";
import { useErp } from "@/erp/store";
import { SearchIcon, openGlobalSearch } from "./Search";
import { SYNC, setSyncNotifier } from "@/erp/persist";

const THEME_KEY = "meksel_theme";
function currentTheme() {
  const a = document.documentElement.getAttribute("data-theme");
  if (a) return a;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AppShell({ children }: { children: ReactNode }) {
  useErp();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const route = path.replace(/^\//, "") || "dashboard";
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setNavigator((r) => {
      setMenuOpen(false);
      void navigate({ to: ("/" + r) as any });
      window.scrollTo(0, 0);
    });
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
    } catch {
      /* ignore */
    }
    setTheme(currentTheme());
  }, [navigate]);

  useEffect(() => setSyncNotifier((m) => toast(m, true)), []);

  // Ctrl+K searches every record; "/" jumps to this screen's search bar.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = ((e.target as HTMLElement).tagName || "").toLowerCase();
      const typing = ["input", "textarea", "select"].includes(tag);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openGlobalSearch(); return; }
      if (e.key === "/" && !typing && !document.querySelector(".modal")) {
        const i = document.getElementById("srch-q") as HTMLInputElement | null;
        if (i) { e.preventDefault(); i.focus(); i.select(); }
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const toggleTheme = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  };

  const u = me();
  return (
    <div className="app">
      <header className="topbar">
        <button className="icon-btn menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">
          <Icon name="menu" />
        </button>
        <img className="brand-logo" src="/mechtek-logo.png" alt="Mechtek" width={47} height={42} />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, lineHeight: 1.2 }}>
          <span className="title">MEK-SEL ERP</span>
          <span className="sub" title={SYNC.error || undefined}>
            Mechtek, Bengaluru · Demo company · {SYNC.status === "online" ? "Saved to Lovable Cloud" : "Offline: changes stay in this browser"}
          </span>
        </div>
        <div className="spacer" />
        <button className="gs-top" id="gs-top" onClick={openGlobalSearch} aria-label="Search everything">
          <SearchIcon /><span>Search everything</span><kbd>Ctrl K</kbd>
        </button>
        <button className="icon-btn" onClick={toggleTheme} aria-label="Switch light or dark theme" title="Switch theme">
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        <button
          className="user-chip"
          title="Sign out"
          onClick={() => {
            closeModal();
            void signOut();
          }}
        >
          <span className="avatar">{u.initials}</span>
          <span className="uname small">
            <span>{u.name}</span>
            <span style={{ color: "var(--shell-muted)", fontSize: 11.5 }}>{u.title}</span>
          </span>
          <span className="icon-btn" style={{ width: 28, height: 28 }} aria-hidden="true">
            <Icon name="logout" />
          </span>
        </button>
      </header>
      <div className="body">
        <aside className={`sidebar ${menuOpen ? "open" : ""}`} aria-label="Main navigation">
          {ROUTES.map((g) => ({ group: g.group, items: g.items.filter((i) => canSee(i[0])) }))
            .filter((g) => g.items.length)
            .map((g) => (
              <div className="nav-group" key={g.group}>
                <div className="nav-label">{g.group}</div>
                <nav className="nav">
                  {g.items.map(([key, label, icon]) => {
                    const c = navCount(key);
                    return (
                      <Link key={key} to={("/" + key) as any} aria-current={route === key ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                        <Icon name={icon} />
                        <span>{label}</span>
                        {c ? <span className="count">{c}</span> : null}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
        </aside>
        <div className={`scrim ${menuOpen ? "show" : ""}`} onClick={() => setMenuOpen(false)} />
        <main className="main" id="main">
          {children}
          <p className="footer-note">
            MEK-SEL ERP prototype · built by Selvantra Technologies for Mechtek · product names and specs from mechtek.in; BOMs,
            rates, customers and transactions are sample data
          </p>
        </main>
      </div>
      <ModalHost />
    </div>
  );
}
