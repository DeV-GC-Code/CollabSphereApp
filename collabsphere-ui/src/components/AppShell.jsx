import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.jsx";
import { TopBar } from "./TopBar.jsx";

export function AppShell() {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="shell-grid">
        <Sidebar />
        <main className="main-panel">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
