import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Building2, Users, FileText, Sparkles, Search, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import api from "../../lib/api.js";
import { usePlatformAdmin } from "../../hooks/usePlatformAdmin.js";

const PLAN_COLORS = {
  FREE:    "bg-gray-100 text-gray-600",
  STARTER: "bg-blue-50 text-blue-700",
  PRO:     "bg-violet-50 text-violet-700",
};

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-violet-600" />
        </div>
        <span className="text-[12px] font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { getToken } = useAuth();
  const { isPlatformAdmin, loading: adminLoading } = usePlatformAdmin();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, orgsRes] = await Promise.all([
        api.get("/admin/stats", { headers }),
        api.get("/admin/orgs", { headers, params: { page, search: query } }),
      ]);
      setStats(statsRes.data);
      setOrgs(orgsRes.data.orgs);
      setTotal(orgsRes.data.total);
      setPages(orgsRes.data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getToken, page, query]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (adminLoading) return null;
  if (!isPlatformAdmin) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      You don't have platform admin access.
    </div>
  );

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setQuery(search);
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Platform Admin</h1>
          <p className="text-[12px] text-gray-400">Manage all ChurchPost organizations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total Churches" value={stats?.totalOrgs} sub={`${stats?.newOrgsThisMonth ?? 0} this month`} />
        <StatCard icon={Users} label="Total Users" value={stats?.totalUsers} />
        <StatCard icon={FileText} label="Posts (30d)" value={stats?.postsThisMonth} />
        <StatCard icon={Sparkles} label="Demo Orgs" value={stats?.demoOrgs} />
      </div>

      {/* Orgs table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <h2 className="text-[14px] font-semibold text-gray-900">Organizations <span className="text-gray-400 font-normal">({total})</span></h2>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orgs…"
                className="pl-8 pr-3 py-1.5 text-[12px] border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 w-48"
              />
            </div>
            <button type="submit" className="px-3 py-1.5 text-[12px] font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : orgs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No organizations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Org</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Members</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Posts</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-7 w-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: org.settings?.primaryColor || "#6366f1" }}
                        >
                          {org.settings?.orgName?.[0] || org.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{org.settings?.orgName || org.name}</p>
                          <p className="text-[11px] text-gray-400">{org.slug}.churchpost.social{org.isDemo ? " · demo" : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${PLAN_COLORS[org.plan]}`}>
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{org._count.users}</td>
                    <td className="px-4 py-3.5 text-gray-600">{org._count.posts}</td>
                    <td className="px-4 py-3.5 text-gray-400">{new Date(org.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => navigate(`/admin/orgs/${org.id}`)}
                        className="px-3 py-1 text-[11px] font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[12px] text-gray-400">Page {page} of {pages}</p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
