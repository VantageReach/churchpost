import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  PenSquare,
  ImagePlay,
  Upload,
  Settings,
  LogOut,
  Sparkles,
  X,
  BarChart2,
  Shield,
} from "lucide-react";
import { cn } from "../../lib/utils.js";
import { useOrgSettings } from "../../hooks/useOrgSettings.js";
import { usePlatformAdmin } from "../../hooks/usePlatformAdmin.js";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
      { to: "/calendar", icon: CalendarDays, label: "Calendar" },
      { to: "/posts", icon: FileText, label: "Posts" },
      { to: "/analytics", icon: BarChart2, label: "Analytics" },
    ],
  },
  {
    label: "Create",
    items: [
      { to: "/compose", icon: PenSquare, label: "Compose" },
      { to: "/graphics", icon: ImagePlay, label: "Create Graphic" },
      { to: "/bulk-upload", icon: Upload, label: "Bulk Upload" },
    ],
  },
  {
    label: "Admin",
    items: [{ to: "/settings", icon: Settings, label: "Settings" }],
  },
];

export default function Sidebar({ open, onClose }) {
  const { signOut } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const settings = useOrgSettings();
  const { isPlatformAdmin } = usePlatformAdmin();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-white/[0.04] transition-transform duration-300 ease-in-out",
        // Mobile: fixed overlay drawer
        "fixed inset-y-0 left-0 z-30 w-[260px]",
        // Desktop: relative, always visible, standard width
        "lg:relative lg:w-[220px] lg:flex-shrink-0 lg:z-auto lg:translate-x-0",
        // Slide in/out on mobile
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      style={{
        background: "linear-gradient(180deg, #12151E 0%, #0D1017 100%)",
      }}
    >
      {/* Logo + Org name + mobile close button */}
      <div className="px-4 py-5 border-b border-white/[0.06] flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: "var(--brand-primary)" }}
        >
          {settings?.logoIconUrl ? (
            <img
              src={settings.logoIconUrl}
              alt={settings.orgName}
              className="h-5 w-5 object-contain"
            />
          ) : (
            <Sparkles className="h-4 w-4 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white/90 font-display leading-none truncate">
            ChurchPost
          </p>
          <p className="text-[10px] text-white/35 mt-0.5 truncate">
            {settings?.orgName ?? "Loading…"}
          </p>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden flex-shrink-0 p-1 rounded-md text-white/30 hover:text-white/60 transition-colors"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {isPlatformAdmin && (
          <div>
            <p className="px-2 mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-400/60">
              Platform
            </p>
            <ul className="space-y-0.5">
              <li>
                <NavLink
                  to="/admin"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                      isActive
                        ? "text-white"
                        : "text-violet-400/70 hover:text-violet-300 hover:bg-white/[0.05]"
                    )
                  }
                  style={({ isActive }) =>
                    isActive ? { backgroundColor: "rgba(139,92,246,0.15)" } : {}
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Shield
                        className="h-[15px] w-[15px] flex-shrink-0"
                        style={isActive ? { color: "#a78bfa" } : {}}
                      />
                      <span className="truncate">Platform Admin</span>
                    </>
                  )}
                </NavLink>
              </li>
            </ul>
          </div>
        )}
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/20">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                        isActive
                          ? "text-white"
                          : "text-white/45 hover:text-white/75 hover:bg-white/[0.05]"
                      )
                    }
                    style={({ isActive }) =>
                      isActive ? { backgroundColor: "rgba(255,255,255,0.08)" } : {}
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className="h-[15px] w-[15px] flex-shrink-0 transition-colors duration-150"
                          style={isActive ? { color: "var(--brand-primary)" } : {}}
                        />
                        <span className="truncate">{label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.06] p-2">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <img
            src={
              user?.imageUrl ||
              `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                user?.firstName || "U"
              )}`
            }
            alt={user?.fullName || "User"}
            className="h-7 w-7 flex-shrink-0 rounded-full ring-1 ring-white/10"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white/70 truncate leading-none">
              {user?.fullName || "User"}
            </p>
            <p className="text-[10px] text-white/30 truncate mt-0.5">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.07] transition-colors duration-150 flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
