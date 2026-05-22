import { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { Send, CalendarDays, FileText, AlertCircle, PenSquare, Upload, Zap } from "lucide-react";
import { useDashboardStats } from "../hooks/useDashboardStats.js";
import ProactiveSuggestionsWidget from "../components/dashboard/ProactiveSuggestionsWidget.jsx";
import UpcomingPostsWidget from "../components/dashboard/UpcomingPostsWidget.jsx";
import PCEventsWidget from "../components/dashboard/PCEventsWidget.jsx";
import { useQueryClient } from "@tanstack/react-query";

function StatCard({ label, value, icon: Icon, iconColor, iconBg, loading, delay, to }) {
  return (
    <Link
      to={to}
      className="rounded-2xl bg-white p-4 lg:p-5 border border-gray-100 shadow-sm animate-fade-in hover:shadow-md hover:border-gray-200 transition-all duration-150 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3 lg:mb-4">
        <div
          className="flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-xl flex-shrink-0 transition-transform duration-150 group-hover:scale-110"
          style={{ background: iconBg }}
        >
          <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-2xl lg:text-3xl font-display font-bold text-gray-900 leading-none mb-1">
        {loading ? (
          <span className="inline-block h-6 w-8 rounded-lg bg-gray-100 animate-pulse" />
        ) : (
          value ?? 0
        )}
      </p>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
    </Link>
  );
}

function QuickAction({ to, icon: Icon, label, description, accent }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3 hover:border-gray-200 hover:shadow-sm transition-all duration-150"
    >
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-110"
        style={{ background: accent + "18" }}
      >
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 truncate">{label}</p>
        <p className="text-[11px] text-gray-400 truncate">{description}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const { data: stats, isLoading } = useDashboardStats();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (location.state?.prefill) {
      navigate("/compose", { state: { prefill: location.state.prefill }, replace: true });
    }
  }, [location.state, navigate]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const STAT_CARDS = [
    {
      label: "Published this month",
      value: stats?.published,
      icon: Send,
      iconColor: "#10b981",
      iconBg: "#ecfdf5",
      to: "/posts?status=PUBLISHED",
    },
    {
      label: "Scheduled",
      value: stats?.scheduled,
      icon: CalendarDays,
      iconColor: "#6366f1",
      iconBg: "#eef2ff",
      to: "/posts?status=SCHEDULED",
    },
    {
      label: "Drafts",
      value: stats?.drafts,
      icon: FileText,
      iconColor: "#f59e0b",
      iconBg: "#fffbeb",
      to: "/posts?status=DRAFT",
    },
    {
      label: "Failed",
      value: stats?.failed,
      icon: AlertCircle,
      iconColor: "#ef4444",
      iconBg: "#fef2f2",
      to: "/posts?status=FAILED",
    },
  ];

  const QUICK_ACTIONS = [
    {
      to: "/compose",
      icon: PenSquare,
      label: "New Post",
      description: "Write & schedule content",
      accent: "var(--brand-primary, #6366f1)",
    },
    {
      to: "/calendar",
      icon: CalendarDays,
      label: "Calendar",
      description: "View your schedule",
      accent: "#10b981",
    },
    {
      to: "/bulk-upload",
      icon: Upload,
      label: "Bulk Upload",
      description: "Import from CSV",
      accent: "#f59e0b",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5 lg:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-display font-bold text-gray-900 tracking-tight">
              {greeting}{user?.firstName ? `, ${user.firstName}` : ""}.
            </h1>
            <p className="text-[13px] text-gray-400 mt-1">
              Here's what's happening with your social media today.
            </p>
          </div>
          {/* Desktop compose shortcut */}
          <Link
            to="/compose"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white shadow-sm hover:opacity-90 transition-opacity flex-shrink-0"
            style={{ background: "var(--brand-primary)" }}
          >
            <PenSquare className="h-3.5 w-3.5" />
            New Post
          </Link>
        </div>

        {/* Quick actions — mobile only (3 tiles) */}
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-white border border-gray-100 p-3 text-center hover:border-gray-200 transition-colors"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: action.accent + "18" }}
              >
                <action.icon className="h-4 w-4" style={{ color: action.accent }} />
              </div>
              <span className="text-[11px] font-semibold text-gray-700 leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {STAT_CARDS.map(({ label, value, icon, iconColor, iconBg, to }, i) => (
            <StatCard
              key={label}
              label={label}
              value={value}
              icon={icon}
              iconColor={iconColor}
              iconBg={iconBg}
              loading={isLoading}
              delay={i * 60}
              to={to}
            />
          ))}
        </div>

        {/* Quick actions — desktop sidebar row */}
        <div className="hidden sm:grid grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <QuickAction key={action.to} {...action} />
          ))}
        </div>

        {/* Main two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2">
            <ProactiveSuggestionsWidget />
          </div>
          <div className="space-y-4 lg:space-y-5">
            <UpcomingPostsWidget posts={stats?.upcoming ?? []} />
            <PCEventsWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
