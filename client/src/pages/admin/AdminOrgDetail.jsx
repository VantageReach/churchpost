import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { ArrowLeft, Trash2, Users, FileText, Calendar, AlertTriangle, Eye } from "lucide-react";
import api, { startImpersonating } from "../../lib/api.js";
import { useQueryClient } from "@tanstack/react-query";

const PLAN_OPTIONS = ["FREE", "STARTER", "PRO"];
const PLAN_COLORS = {
  FREE:    "bg-gray-100 text-gray-600",
  STARTER: "bg-blue-50 text-blue-700",
  PRO:     "bg-violet-50 text-violet-700",
};
const ROLE_LABELS = { ORG_ADMIN: "Admin", EDITOR: "Editor", VIEWER: "Viewer" };

export default function AdminOrgDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const queryClient = useQueryClient();
  const [org, setOrg] = useState(null);
  const [postCounts, setPostCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState("FREE");
  const [isDemo, setIsDemo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const { data } = await api.get(`/admin/orgs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrg(data.org);
        setPostCounts(data.postCounts);
        setPlan(data.org.plan);
        setIsDemo(data.org.isDemo);
        setEditName(data.org.name);
        setEditSlug(data.org.slug);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const token = await getToken();
      const { data } = await api.patch(`/admin/orgs/${id}`, {
        plan, isDemo, name: editName, slug: editSlug,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setOrg((prev) => ({ ...prev, ...data.org }));
    } catch (err) {
      alert(err?.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleImpersonate() {
    startImpersonating(org.id);
    queryClient.clear();
    window.location.href = "/";
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const token = await getToken();
      await api.delete(`/admin/orgs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      navigate("/admin");
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  if (!org) return <div className="p-8 text-sm text-gray-400">Org not found.</div>;

  const settings = org.settings;
  const totalPosts = postCounts.reduce((sum, g) => sum + g._count, 0);

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to organizations
        </button>

        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: settings?.brandPrimaryColor || "#6366f1" }}
          >
            {(org.name)[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{org.name}</h1>
            <p className="text-[12px] text-gray-400">
              {org.slug}.churchpost.social · Created {new Date(org.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className={`ml-auto inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${PLAN_COLORS[org.plan]}`}>
            {org.plan}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users, label: "Members", value: org.users.length },
          { icon: FileText, label: "Total Posts", value: totalPosts },
          { icon: Calendar, label: "Joined", value: new Date(org.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
            <Icon className="h-4 w-4 text-gray-400 mx-auto mb-1.5" />
            <p className="text-lg font-bold text-gray-900">{value}</p>
            <p className="text-[11px] text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Plan management */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-gray-900">Plan & Settings</h2>
            <button
              onClick={handleImpersonate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" /> View as org
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Slug</label>
              <input
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Plan</label>
            <div className="flex gap-2">
              {PLAN_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-semibold border transition-colors ${
                    plan === p
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <p className="text-[13px] font-medium text-gray-700">Demo org</p>
              <p className="text-[11px] text-gray-400">Marks this as a demo/test organization</p>
            </div>
            <button
              onClick={() => setIsDemo(!isDemo)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isDemo ? "bg-violet-600" : "bg-gray-200"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${isDemo ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Post counts by status */}
          {postCounts.length > 0 && (
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">Posts by status</p>
              {postCounts.map((g) => (
                <div key={g.status} className="flex justify-between text-[12px]">
                  <span className="text-gray-500 capitalize">{g.status.toLowerCase()}</span>
                  <span className="font-medium text-gray-700">{g._count}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || (plan === org.plan && isDemo === org.isDemo && editName === org.name && editSlug === org.slug)}
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: "var(--brand-primary)" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {/* Members */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[14px] font-semibold text-gray-900">Members ({org.users.length})</h2>
          </div>
          <div className="divide-y divide-gray-100/80">
            {org.users.length === 0 && (
              <p className="px-5 py-4 text-[12px] text-gray-400">No members yet.</p>
            )}
            {org.users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <img
                  src={u.imageUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(u.name || u.clerkId)}`}
                  alt=""
                  className="h-7 w-7 rounded-full flex-shrink-0 ring-1 ring-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-800 truncate">{u.name || "Unknown user"}</p>
                  <p className="text-[11px] text-gray-400 truncate">{u.email || u.clerkId}</p>
                </div>
                <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  {ROLE_LABELS[u.role] || u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
        <h2 className="text-[14px] font-semibold text-red-700 mb-1">Danger zone</h2>
        <p className="text-[12px] text-gray-400 mb-4">Permanently delete this organization and all its data. This cannot be undone.</p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Delete organization
          </button>
        ) : (
          <div className="bg-red-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p className="text-[13px] font-semibold">Are you sure? This will delete all posts, settings, and member data.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting…" : "Yes, delete permanently"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
