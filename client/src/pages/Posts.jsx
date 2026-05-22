import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  PenSquare,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  FileEdit,
  Image,
  Send,
  ExternalLink,
  Pencil,
} from "lucide-react";

const PLATFORM_ICONS = {
  facebook: "🇫",
  instagram: "📸",
  youtube: "▶️",
  tiktok: "🎵",
  twitter: "𝕏",
};

function platformDisplayName(platform) {
  return { facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok", twitter: "X" }[platform] ?? platform;
}

function buildFallbackUrl(platform, externalId) {
  if (!externalId) return null;
  switch (platform) {
    case "facebook":
      if (externalId.includes("_")) {
        const idx = externalId.indexOf("_");
        return `https://www.facebook.com/${externalId.slice(0, idx)}/posts/${externalId.slice(idx + 1)}`;
      }
      return `https://www.facebook.com/photo/?fbid=${externalId}`;
    case "instagram":
      return null; // permalink stored from API on new posts; can't construct from media ID
    case "youtube":
      return `https://www.youtube.com/watch?v=${externalId}`;
    case "twitter":
      return `https://x.com/i/web/status/${externalId}`;
    default:
      return null;
  }
}
import PlatformBadge from "../components/shared/PlatformBadge.jsx";
import { usePosts, useDeletePost, usePublishPost } from "../hooks/usePosts.js";
import { cn } from "../lib/utils.js";

const STATUS_META = {
  DRAFT: { label: "Draft", icon: FileEdit, color: "text-gray-500", bg: "bg-gray-100" },
  SCHEDULED: { label: "Scheduled", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  PUBLISHED: { label: "Published", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  FAILED: { label: "Failed", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
  PARTIAL: { label: "Partial", icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
};

const STATUS_FILTERS = ["All", "DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"];
const PLATFORM_FILTERS = ["All", "facebook", "instagram", "youtube", "tiktok"];

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.DRAFT;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
        meta.bg,
        meta.color
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function PostRow({ post, onDelete, onPublish, onEdit }) {
  const firstCaption = Object.values(post.captions ?? {})[0] ?? "";
  const scheduledLabel = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex items-start gap-3 lg:gap-4 px-3 lg:px-5 py-3 lg:py-4 border-b border-gray-100 hover:bg-gray-50/60 transition-colors group">
      {/* Media thumbnail or placeholder */}
      <div className="flex-shrink-0 h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
        {post.mediaAssets?.[0] ? (
          post.mediaAssets[0].type === "IMAGE" ? (
            <img
              src={post.mediaAssets[0].url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <FileText className="h-5 w-5 text-gray-400" />
          )
        ) : (
          <Image className="h-5 w-5 text-gray-300" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {post.title && (
            <span className="text-[13px] font-semibold text-gray-800 truncate max-w-[200px]">
              {post.title}
            </span>
          )}
          <StatusBadge status={post.status} />
          {scheduledLabel && (
            <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {scheduledLabel}
            </span>
          )}
        </div>
        <p className="text-[13px] text-gray-500 truncate leading-snug">{firstCaption}</p>
        {(post.status === "FAILED" || post.status === "PARTIAL") && post.failureReason && (
          <p className="text-[11px] text-red-500 mt-0.5 truncate">
            ⚠ {post.failureReason}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {(post.platforms ?? []).map((p) => (
            <PlatformBadge key={p} platform={p} size="sm" />
          ))}
          {post.mediaAssets?.length > 0 && (
            <span className="text-[10px] text-gray-400 ml-1">
              {post.mediaAssets.length} file{post.mediaAssets.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {post.status === "PUBLISHED" && (post.platformResults ?? []).length > 0 && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {post.platformResults.filter((r) => r.status === "published").map((r) => {
              const url = r.permalink ?? buildFallbackUrl(r.platform, r.externalId);
              if (!url) return null;
              return (
                <a
                  key={r.platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  View on {platformDisplayName(r.platform)}
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <span className="text-[11px] text-gray-400 mr-2">
          {post.author?.name}
        </span>
        {(post.status === "DRAFT" || post.status === "SCHEDULED") && (
          <button
            onClick={() => onEdit(post)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="Edit post"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {(post.status === "DRAFT" || post.status === "SCHEDULED" || post.status === "FAILED") && (
          <button
            onClick={() => onPublish(post.id)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Publish now"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(post.id)}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete post"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
        active
          ? "text-white shadow-sm"
          : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300"
      )}
      style={active ? { background: "var(--brand-primary)" } : {}}
    >
      {label === "All" ? label : label.charAt(0).toUpperCase() + label.slice(1)}
    </button>
  );
}

export default function Posts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "All";
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTERS.includes(initialStatus) ? initialStatus : "All");
  const [platformFilter, setPlatformFilter] = useState("All");

  const filters = {};
  if (statusFilter !== "All") filters.status = statusFilter;
  if (platformFilter !== "All") filters.platform = platformFilter;

  const { data, isLoading } = usePosts(filters);
  const deletePost = useDeletePost();
  const publishPost = usePublishPost();

  async function handleDelete(id) {
    if (!window.confirm("Delete this post?")) return;
    deletePost.mutate(id);
  }

  function handlePublish(id) {
    publishPost.mutate(id);
  }

  function handleEdit(post) {
    navigate("/compose", { state: { editPost: post } });
  }

  const posts = data?.posts ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-8 py-4 lg:py-5 border-b border-gray-100 bg-[#F7F7F5]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
            <FileText className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold text-gray-900 font-display leading-none">
              Posts
            </h1>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {total} post{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Link
          to="/compose"
          className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-all hover:opacity-90 shadow-sm"
          style={{ background: "var(--brand-primary)" }}
        >
          <PenSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Post</span>
        </Link>
      </div>

      {/* Filters — horizontally scrollable on mobile */}
      <div className="px-4 lg:px-8 py-3 border-b border-gray-100 bg-white overflow-x-auto">
        <div className="flex items-center gap-4 min-w-max lg:min-w-0 lg:flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 font-medium">Status:</span>
            {STATUS_FILTERS.map((f) => (
              <FilterChip
                key={f}
                label={f === "All" ? "All" : STATUS_META[f]?.label ?? f}
                active={statusFilter === f}
                onClick={() => setStatusFilter(f)}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 font-medium">Platform:</span>
            {PLATFORM_FILTERS.map((f) => (
              <FilterChip
                key={f}
                label={f}
                active={platformFilter === f}
                onClick={() => setPlatformFilter(f)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-gray-300" />
            </div>
            <h2 className="text-[15px] font-semibold text-gray-700 mb-1">No posts yet</h2>
            <p className="text-[13px] text-gray-400 mb-6 max-w-xs">
              Create your first post and schedule it across platforms.
            </p>
            <Link
              to="/compose"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: "var(--brand-primary)" }}
            >
              <PenSquare className="h-3.5 w-3.5" />
              Compose your first post
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl m-3 lg:m-6 overflow-hidden border border-gray-100 shadow-sm">
            {posts.map((post) => (
              <PostRow key={post.id} post={post} onDelete={handleDelete} onPublish={handlePublish} onEdit={handleEdit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
