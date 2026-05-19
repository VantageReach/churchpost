import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Sparkles } from "lucide-react";
import Sidebar from "./Sidebar.jsx";
import { useOrgSettings } from "../../hooks/useOrgSettings.js";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const settings = useOrgSettings();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F7F7F5]">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100 bg-[#F7F7F5] lg:hidden flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "var(--brand-primary, #6366f1)" }}
            >
              {settings?.logoIconUrl ? (
                <img src={settings.logoIconUrl} alt="" className="h-4 w-4 object-contain" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-white" />
              )}
            </div>
            <span className="text-[15px] font-semibold text-gray-900 font-display">ChurchPost</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
