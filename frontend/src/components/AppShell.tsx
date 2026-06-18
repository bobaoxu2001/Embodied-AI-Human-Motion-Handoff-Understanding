import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

// One persistent shell for the workspace routes: Sidebar + TopBar + scrollable
// RouteOutlet (HANDOFF.md §1). The landing page renders outside this shell.
export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 min-w-0 flex flex-col"
        style={{
          background:
            "radial-gradient(900px 500px at 100% -20%,#0e1b2422,transparent),#080b0f",
        }}
      >
        <TopBar />
        <div className="flex-1 overflow-y-auto px-[26px] pt-6 pb-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
