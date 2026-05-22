import { NavLink, useParams } from "react-router-dom";
import {
  Settings as SettingsIcon,
  Palette,
  Plug,
  Users,
  CreditCard,
  UserCircle,
} from "lucide-react";
import { cn } from "../lib/utils.js";
import BrandingPanel from "../components/settings/BrandingPanel.jsx";
import GeneralPanel from "../components/settings/GeneralPanel.jsx";
import TeamPanel from "../components/settings/TeamPanel.jsx";
import PlatformsPanel from "../components/settings/PlatformsPanel.jsx";
import AccountPanel from "../components/settings/AccountPanel.jsx";
import ProfilePanel from "../components/settings/ProfilePanel.jsx";

const TABS = [
  { key: "general", label: "General & AI", icon: SettingsIcon, to: "/settings" },
  { key: "branding", label: "Branding", icon: Palette, to: "/settings/branding" },
  { key: "platforms", label: "Integrations", icon: Plug, to: "/settings/platforms" },
  { key: "team", label: "Team", icon: Users, to: "/settings/team" },
  { key: "account", label: "Account", icon: CreditCard, to: "/settings/account" },
  { key: "profile", label: "Profile", icon: UserCircle, to: "/settings/profile" },
];

function ComingSoon({ label, stage }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <SettingsIcon className="h-6 w-6 text-gray-300" />
      </div>
      <h2 className="text-[15px] font-semibold text-gray-700 mb-1">{label}</h2>
      <p className="text-[13px] text-gray-400">Coming in Stage {stage}</p>
    </div>
  );
}

export default function Settings() {
  const { tab } = useParams();
  const activeTab = tab || "general";

  function renderContent() {
    switch (activeTab) {
      case "general":
        return <GeneralPanel />;
      case "branding":
        return <BrandingPanel />;
      case "platforms":
        return <PlatformsPanel />;
      case "team":
        return <TeamPanel />;
      case "account":
        return <AccountPanel />;
      case "profile":
        return <ProfilePanel />;
      default:
        return <GeneralPanel />;
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 lg:px-8 py-4 lg:py-5 border-b border-gray-100 bg-[#F7F7F5]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
          <SettingsIcon className="h-4 w-4 text-gray-500" />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 font-display leading-none">
            Settings
          </h1>
          <p className="text-[12px] text-gray-400 mt-0.5">
            Configure your org, branding, platforms, and team
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-4 lg:py-8 flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Tab nav — horizontal scroll on mobile, vertical sidebar on desktop */}
          <nav className="lg:w-44 lg:flex-shrink-0">
            {/* Mobile: horizontal pill tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
              {TABS.map(({ key, label, icon: Icon, to }) => (
                <NavLink
                  key={key}
                  to={to}
                  end={key === "general"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap flex-shrink-0 transition-all duration-150",
                      isActive
                        ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                        : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
                    )
                  }
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
            {/* Desktop: vertical list */}
            <div className="hidden lg:flex flex-col space-y-0.5">
              {TABS.map(({ key, label, icon: Icon, to }) => (
                <NavLink
                  key={key}
                  to={to}
                  end={key === "general"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 w-full",
                      isActive
                        ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                        : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
                    )
                  }
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 rounded-2xl bg-white border border-gray-100 shadow-sm p-4 lg:p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
