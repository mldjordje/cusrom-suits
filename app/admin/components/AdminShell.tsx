"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import AdminPwaInstallButton from "./AdminPwaInstallButton";

type AdminShellProps = {
  generatedAt: string;
  viewerName: string;
  viewerRoles: string[];
  sidebar: ReactNode;
  children: ReactNode;
};

export default function AdminShell({ generatedAt, viewerName, viewerRoles, sidebar, children }: AdminShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <div className={drawerOpen ? "admin-shell-root admin-shell-root--drawer-open" : "admin-shell-root"}>
      <div className="admin-shell-shell">
        {drawerOpen ? (
          <button
            type="button"
            className="admin-shell-backdrop"
            aria-label="Zatvori navigaciju"
            onClick={closeDrawer}
          />
        ) : null}

        <aside
          className="admin-shell-sidebar"
          id="admin-sidebar-nav"
          aria-label="Admin meni"
          onClick={closeDrawer}
        >
          {sidebar}
        </aside>

        <div className="admin-shell-main">
          <header className="admin-shell-topbar">
            <div className="admin-shell-topbar-row">
              <button
                type="button"
                className="admin-shell-menu-toggle"
                aria-expanded={drawerOpen}
                aria-controls="admin-sidebar-nav"
                onClick={() => (drawerOpen ? closeDrawer() : openDrawer())}
              >
                <span className="admin-shell-menu-toggle-bars" aria-hidden="true" />
                <span className="admin-shell-menu-toggle-label">Meni</span>
              </button>
              <div className="admin-shell-topbar-title">
                <p>Admin panel</p>
                <h1>Santos operacije</h1>
              </div>
            </div>
            <div className="admin-shell-topbar-meta">
              <span className="admin-topbar-hide-mobile">Status: Online</span>
              <span className="admin-topbar-hide-mobile">{viewerName}</span>
              <span className="admin-topbar-hide-mobile">{viewerRoles.join(", ") || "admin"}</span>
              <Link href="/admin/tutorial" onClick={closeDrawer} className="admin-topbar-hide-mobile">
                Tutorial
              </Link>
              <span className="admin-topbar-hide-mobile"><AdminPwaInstallButton /></span>
              <span className="admin-topbar-hide-mobile">{generatedAt}</span>
              <form action="/api/admin/logout" method="post">
                <button type="submit" className="admin-shell-logout">
                  Logout
                </button>
              </form>
            </div>
          </header>
          <section className="admin-shell-content">{children}</section>
        </div>
      </div>
    </div>
  );
}
