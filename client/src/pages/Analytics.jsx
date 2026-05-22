import { useState } from "react";
import {
  BarChart2,
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Play,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  useAnalyticsOverview,
  useAnalyticsPosts,
  useAccountMetrics,
  useTriggerAnalyticsSync,
} from "../hooks/useAnalytics.js";
import { cn } from "../lib/utils.js";

const DAY_OPTIONS = [7, 30, 90];
const PLATFORM_FILTERS = ["all", "facebook", "instagram", "youtube", "tiktok"];

const PLATFORM_COLORS = {
  facebook: "#1877f2",
  instagram: "#e1306c",
  youtube: "#ff0000",
  tiktok: "#010101",
};

function fmt(n, decimals = 0) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(decimals);
}

function StatTile({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: color + "18" }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 font-display leading-none">
        {loading ? (
          <span className="inline-block h-6 w-14 rounded-lg bg-gray-100 animate-pulse" />
        ) : (
          fmt(value)
        )}
      </p>
    </div>
  );
}

function PostMetricRow({ post }) {
  const platforms = post.platforms ?? [];
  const allMetrics = Object.values(post.metrics ?? {});
  const totalImpressions = allMetrics.reduce((s, m) => s + (m?.impressions || 0), 0);
  const totalLikes = allMetrics.reduce((s, m) => s + (m?.likes || 0), 0);
  const totalComments = allMetrics.reduce((s, m) => s + (m?.comments || 0), 0);
  const avgEng = allMetrics.filter((m) => m?.engagementRate != null);
  const engRate =
    avgEng.length > 0
      ? (avgEng.reduce((s, m) => s + m.engagementRate, 0) / avgEng.length).toFixed(1)
      : null;

  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const hasMetrics = allMetrics.some((m) => m?.impressions != null || m?.likes != null);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
      {/* Thumbnail */}
      <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
        {post.thumbnail ? (
          <img src={post.thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <BarChart2 className="h-4 w-4 text-gray-300" />
        )}
      </div>

      {/* Caption + platforms */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-800 truncate">
          {post.title || Object.values(post.captions ?? {})[0]?.slice(0, 60) || "Untitled"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {platforms.map((p) => (
            <span
              key={p}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: PLATFORM_COLORS[p] + "18", color: PLATFORM_COLORS[p] }}
            >
              {p}
            </span>
          ))}
          {publishedDate && (
            <span className="text-[10px] text-gray-400">{publishedDate}</span>
          )}
        </div>
      </div>

      {/* Metrics */}
      {hasMetrics ? (
        <div className="hidden sm:flex items-center gap-5 text-right flex-shrink-0">
          <div>
            <p className="text-[13px] font-bold text-gray-800">{fmt(totalImpressions)}</p>
            <p className="text-[10px] text-gray-400">Impressions</p>
          </div>
          <div>
            <p className="text-[13px] font-bold text-gray-800">{fmt(totalLikes)}</p>
            <p className="text-[10px] text-gray-400">Likes</p>
          </div>
          <div>
            <p className="text-[13px] font-bold text-gray-800">{fmt(totalComments)}</p>
            <p className="text-[10px] text-gray-400">Comments</p>
          </div>
          {engRate != null && (
            <div>
              <p className="text-[13px] font-bold text-emerald-600">{engRate}%</p>
              <p className="text-[10px] text-gray-400">Eng. rate</p>
            </div>
          )}
        </div>
      ) : (
        <span className="text-[11px] text-gray-300 flex-shrink-0">No data yet</span>
      )}
    </div>
  );
}

function EmptyAnalytics() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <BarChart2 className="h-6 w-6 text-gray-300" />
      </div>
      <h2 className="text-[15px] font-semibold text-gray-700 mb-1">No analytics data yet</h2>
      <p className="text-[13px] text-gray-400 max-w-xs">
        Metrics are collected automatically after posts are published. Try syncing manually or check back after your next post goes live.
      </p>
    </div>
  );
}

function NoDataMessage({ platform }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <AlertCircle className="h-5 w-5 text-gray-300 mb-2" />
      <p className="text-[13px] text-gray-400">
        No data for {platform === "all" ? "any platform" : platform} in this window.
      </p>
      <p className="text-[11px] text-gray-300 mt-1">
        Metrics appear 1–24h after publishing.
      </p>
    </div>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [platform, setPlatform] = useState("all");

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(days);
  const { data: postsData, isLoading: postsLoading } = useAnalyticsPosts({ days, platform });
  const { data: accountData, isLoading: accountLoading } = useAccountMetrics(days, platform);
  const syncMutation = useTriggerAnalyticsSync();

  const posts = postsData?.posts ?? [];
  const accountMetrics = accountData?.metrics ?? [];

  // Build follower chart data — group by date
  const followerChartData = (() => {
    const byDate = {};
    for (const m of accountMetrics) {
      const date = new Date(m.snapshotDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!byDate[date]) byDate[date] = { date };
      byDate[date][m.platform] = m.followers;
    }
    return Object.values(byDate);
  })();

  // Build engagement bar chart — top posts by total engagement
  const engagementData = posts
    .map((p) => {
      const metrics = Object.values(p.metrics ?? {});
      const eng =
        metrics.reduce((s, m) => s + (m?.likes || 0) + (m?.comments || 0) + (m?.shares || 0), 0);
      return {
        label: (p.title || Object.values(p.captions ?? {})[0] || "Post").slice(0, 20),
        engagement: eng,
      };
    })
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 8);

  const syncStatuses = overview?.syncStatuses ?? {};
  const isSyncing = Object.values(syncStatuses).some((s) => s?.status === "syncing");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-8 py-4 lg:py-5 border-b border-gray-100 bg-[#F7F7F5]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
            <BarChart2 className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold text-gray-900 font-display leading-none">Analytics</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">Performance across all platforms</p>
          </div>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending || isSyncing}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", (syncMutation.isPending || isSyncing) && "animate-spin")} />
          <span className="hidden sm:inline">{isSyncing ? "Syncing…" : "Sync Now"}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 lg:px-8 py-3 border-b border-gray-100 bg-white overflow-x-auto">
        <div className="flex items-center gap-4 min-w-max lg:min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 font-medium">Period:</span>
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                  days === d
                    ? "text-white shadow-sm"
                    : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300"
                )}
                style={days === d ? { background: "var(--brand-primary)" } : {}}
              >
                {d}d
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 font-medium">Platform:</span>
            {PLATFORM_FILTERS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all capitalize",
                  platform === p
                    ? "text-white shadow-sm"
                    : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300"
                )}
                style={platform === p ? { background: PLATFORM_COLORS[p] ?? "var(--brand-primary)" } : {}}
              >
                {p === "all" ? "All" : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-5 lg:py-7 space-y-6">

          {/* Overview stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatTile label="Impressions" value={overview?.totalImpressions} icon={Eye} color="#6366f1" loading={overviewLoading} />
            <StatTile label="Reach" value={overview?.totalReach} icon={TrendingUp} color="#10b981" loading={overviewLoading} />
            <StatTile label="Likes" value={overview?.totalLikes} icon={Heart} color="#e1306c" loading={overviewLoading} />
            <StatTile label="Comments" value={overview?.totalComments} icon={MessageCircle} color="#f59e0b" loading={overviewLoading} />
            <StatTile label="Shares" value={overview?.totalShares} icon={Share2} color="#3b82f6" loading={overviewLoading} />
            <StatTile label="Video Views" value={overview?.totalVideoViews} icon={Play} color="#ff0000" loading={overviewLoading} />
          </div>

          {/* Follower totals + avg engagement */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                <Users className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 font-display leading-none">
                  {overviewLoading ? (
                    <span className="inline-block h-6 w-14 rounded-lg bg-gray-100 animate-pulse" />
                  ) : (
                    fmt(overview?.totalFollowers)
                  )}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Total followers</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 font-display leading-none">
                  {overviewLoading ? (
                    <span className="inline-block h-6 w-14 rounded-lg bg-gray-100 animate-pulse" />
                  ) : overview?.avgEngagementRate != null ? (
                    `${overview.avgEngagementRate}%`
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Avg engagement rate</p>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Follower growth */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <h3 className="text-[13px] font-semibold text-gray-700 mb-4">Follower Growth</h3>
              {followerChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={followerChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      {Object.entries(PLATFORM_COLORS).map(([p, color]) => (
                        <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(v, name) => [fmt(v), name]}
                    />
                    {Object.entries(PLATFORM_COLORS).map(([p, color]) => (
                      <Area
                        key={p}
                        type="monotone"
                        dataKey={p}
                        stroke={color}
                        fill={`url(#grad-${p})`}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <NoDataMessage platform={platform} />
              )}
            </div>

            {/* Top posts by engagement */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <h3 className="text-[13px] font-semibold text-gray-700 mb-4">Top Posts by Engagement</h3>
              {engagementData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={engagementData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(v) => [fmt(v), "Engagement"]}
                    />
                    <Bar dataKey="engagement" fill="var(--brand-primary, #6366f1)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <NoDataMessage platform={platform} />
              )}
            </div>
          </div>

          {/* Post-level metrics table */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-[13px] font-semibold text-gray-700">Post Performance</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Most recent snapshot per post</p>
            </div>
            {postsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <EmptyAnalytics />
            ) : (
              posts.map((p) => <PostMetricRow key={p.id} post={p} />)
            )}
          </div>

          {/* Platform sync status */}
          {Object.keys(syncStatuses).length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <h3 className="text-[13px] font-semibold text-gray-700 mb-3">Sync Status</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(syncStatuses).map(([plat, s]) => (
                  <div key={plat} className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{
                        background:
                          s.status === "success"
                            ? "#10b981"
                            : s.status === "syncing"
                            ? "#f59e0b"
                            : s.status === "error"
                            ? "#ef4444"
                            : "#d1d5db",
                      }}
                    />
                    <span className="text-[12px] capitalize text-gray-700">{plat}</span>
                    {s.lastSyncedAt && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(s.lastSyncedAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
