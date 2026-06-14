import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.jsx";
import { TopBar } from "./TopBar.jsx";
import { CommandPalette } from "./CommandPalette.jsx";

export function AppShell() {
  return (
    <div className="app">
      <Sidebar />
      <div className="app-body">
        <TopBar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
