"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

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
    <div className={drawerOpen ? "admin-template-root admin-template-root--drawer-open" : "admin-template-root"}>
      <div className="admin-template-shell">
        {drawerOpen ? (
          <button
            type="button"
            className="admin-template-backdrop"
            aria-label="Zatvori navigaciju"
            onClick={closeDrawer}
          />
        ) : null}

        <aside
          className="admin-template-sidebar"
          id="admin-sidebar-nav"
          aria-label="Admin meni"
          onClick={closeDrawer}
        >
          {sidebar}
        </aside>

        <div className="admin-template-main">
          <header className="admin-template-topbar">
            <div className="admin-template-topbar-row">
              <button
                type="button"
                className="admin-template-menu-toggle"
                aria-expanded={drawerOpen}
                aria-controls="admin-sidebar-nav"
                onClick={() => (drawerOpen ? closeDrawer() : openDrawer())}
              >
                <span className="admin-template-menu-toggle-bars" aria-hidden="true" />
                <span className="admin-template-menu-toggle-label">Meni</span>
              </button>
              <div className="admin-template-topbar-title">
                <p>Admin panel</p>
                <h1>Santos operacije</h1>
              </div>
            </div>
            <div className="admin-template-topbar-meta">
              <span>Status: Online</span>
              <span>{viewerName}</span>
              <span>{viewerRoles.join(", ") || "admin"}</span>
              <Link href="/admin/tutorial" onClick={closeDrawer}>
                Tutorial
              </Link>
              <span>{generatedAt}</span>
              <form action="/api/admin/logout" method="post">
                <button type="submit" className="admin-template-logout">
                  Logout
                </button>
              </form>
            </div>
          </header>
          <section className="admin-template-content">{children}</section>
        </div>
      </div>
    </div>
  );
}
