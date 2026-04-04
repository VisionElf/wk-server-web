import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { documentTitleForPath } from "../core/documentTitle";
import { AppSubNav } from "./AppSubNav";
import { Sidebar } from "./Sidebar";
import "./shell.css";

function OutletFallback() {
  return <div className="app-pagePending">Loading…</div>;
}

export function AppShell() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = documentTitleForPath(pathname);
  }, [pathname]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <AppSubNav />
        <div className="app-outlet">
          <Suspense fallback={<OutletFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
