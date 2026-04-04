import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AppSubNav } from "./AppSubNav";
import { Sidebar } from "./Sidebar";
import "./shell.css";

function OutletFallback() {
  return <div className="app-pagePending">Loading…</div>;
}

export function AppShell() {
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
