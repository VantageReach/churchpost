import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PenSquare, Save, Send } from "lucide-react";
import PlatformSelector from "../components/composer/PlatformSelector.jsx";
import CaptionEditor from "../components/composer/CaptionEditor.jsx";
import MediaUpload from "../components/composer/MediaUpload.jsx";
import SchedulePicker from "../components/composer/SchedulePicker.jsx";
import AiPanel from "../components/composer/AiPanel.jsx";
import GraphicBuilderModal from "../components/graphicBuilder/GraphicBuilderModal.jsx";
import { useCreatePost, useUploadMedia, useAiSuggest, usePublishPost } from "../hooks/usePosts.js";

const DEFAULT_PLATFORMS = ["facebook", "instagram"];

function Section({ title, children }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">{title}</h3>
      {children}
    </div>
  );
}

export default function Compose() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;

  const initPlatforms = prefill?.platforms ?? DEFAULT_PLATFORMS;
  const initCaptions = prefill?.caption
    ? Object.fromEntries(initPlatforms.map((p) => [p, prefill.caption]))
    : {};

  const [platforms, setPlatforms] = useState(initPlatforms);
  const [captions, setCaptions] = useState(initCaptions);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [scheduledAt, setScheduledAt] = useState(prefill?.scheduledAt ?? null);
  const [title, setTitle] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [graphicBuilderOpen, setGraphicBuilderOpen] = useState(false);
  const [graphicPrefill, setGraphicPrefill] = useState(null);

  const createPost = useCreatePost();
  const uploadMedia = useUploadMedia();
  const aiSuggest = useAiSuggest();
  const publishPost = usePublishPost();

  const isSaving = createPost.isPending || publishPost.isPending;
  const isUploading = uploadMedia.isPending;

  function handlePlatformChange(newPlatforms) {
    setPlatforms(newPlatforms);
    const updated = { ...captions };
    Object.keys(updated).forEach((p) => {
      if (!newPlatforms.includes(p)) delete updated[p];
    });
    setCaptions(updated);
  }

  function handleUseAiCaption(caption) {
    const updated = {};
    platforms.forEach((p) => (updated[p] = caption));
    setCaptions(updated);
  }

  async function handleMediaDrop(files) {
    try {
      const uploaded = await uploadMedia.mutateAsync(files);
      setMediaAssets((prev) => [...prev, ...uploaded]);
    } catch {
      setError("Media upload failed. Please try again.");
    }
  }

  function handleRemoveMedia(asset) {
    setMediaAssets((prev) => prev.filter((a) => a.url !== asset.url));
  }

  function openGraphicBuilder(prefill = null) {
    setGraphicPrefill(prefill);
    setGraphicBuilderOpen(true);
  }

  async function handleGraphicExport(file) {
    try {
      const uploaded = await uploadMedia.mutateAsync([file]);
      setMediaAssets((prev) => [...prev, ...uploaded]);
    } catch {
      setError("Failed to attach graphic. Please try again.");
    }
  }

  async function handleAiSuggest(payload) {
    try {
      const suggestions = await aiSuggest.mutateAsync(payload);
      setAiSuggestions(suggestions);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "AI generation failed. Check server logs.");
    }
  }

  async function save(status) {
    setError(null);
    const hasCaption = platforms.some((p) => captions[p]?.trim());
    if (!hasCaption) {
      setError("Please write a caption for at least one platform.");
      return;
    }
    if (platforms.length === 0) {
      setError("Please select at least one platform.");
      return;
    }

    try {
      await createPost.mutateAsync({
        title: title || null,
        captions,
        platforms,
        status,
        scheduledAt: status === "SCHEDULED" ? scheduledAt : null,
        mediaAssets,
      });
      navigate("/posts");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save post.");
    }
  }

  async function publishNow() {
    setError(null);
    const hasCaption = platforms.some((p) => captions[p]?.trim());
    if (!hasCaption) {
      setError("Please write a caption for at least one platform.");
      return;
    }
    if (platforms.length === 0) {
      setError("Please select at least one platform.");
      return;
    }

    try {
      const post = await createPost.mutateAsync({
        title: title || null,
        captions,
        platforms,
        status: "DRAFT",
        scheduledAt: null,
        mediaAssets,
      });
      await publishPost.mutateAsync(post.id);
      navigate("/posts");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to publish post.");
    }
  }

  return (
    <>
    <GraphicBuilderModal
      open={graphicBuilderOpen}
      onClose={() => setGraphicBuilderOpen(false)}
      onExport={handleGraphicExport}
      prefill={graphicPrefill}
    />
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-8 py-4 lg:py-5 border-b border-gray-100 bg-[#F7F7F5]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
            <PenSquare className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold text-gray-900 font-display leading-none">
              New Post
            </h1>
            <p className="text-[12px] text-gray-400 mt-0.5">Compose and schedule social content</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => save("DRAFT")}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save Draft</span>
          </button>
          <button
            type="button"
            onClick={publishNow}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-sm bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Publish Now</span>
          </button>
          <button
            type="button"
            onClick={() => save(scheduledAt ? "SCHEDULED" : "DRAFT")}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
            style={{ background: "var(--brand-primary)" }}
          >
            <Send className="h-3.5 w-3.5" />
            {scheduledAt ? "Schedule" : "Save"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 lg:px-8 py-4 lg:py-8 space-y-6 lg:space-y-8">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

          {/* Title */}
          <Section title="Post Title (optional)">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunday Service — May 18"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </Section>

          {/* Platforms */}
          <Section title="Platforms">
            <PlatformSelector selected={platforms} onChange={handlePlatformChange} />
          </Section>

          {/* AI Panel */}
          {platforms.length > 0 && (
            <AiPanel
              platforms={platforms}
              onUseCaption={handleUseAiCaption}
              onSuggest={handleAiSuggest}
              isLoading={aiSuggest.isPending}
              suggestions={aiSuggestions}
              error={aiSuggest.isError ? (aiSuggest.error?.response?.data?.error || aiSuggest.error?.message) : null}
              initialTopic={prefill?.aiTopic}
            />
          )}

          {/* Caption */}
          {platforms.length > 0 && (
            <Section title="Caption">
              <CaptionEditor
                platforms={platforms}
                captions={captions}
                onChange={setCaptions}
              />
            </Section>
          )}

          {/* Media */}
          <Section title="Media">
            <MediaUpload
              assets={mediaAssets}
              onAdd={handleMediaDrop}
              onRemove={handleRemoveMedia}
              isUploading={isUploading}
              onOpenGraphicBuilder={() => openGraphicBuilder()}
            />
          </Section>

          {/* Schedule */}
          <Section title="Schedule">
            <SchedulePicker scheduledAt={scheduledAt} onChange={setScheduledAt} />
          </Section>
        </div>
      </div>
    </div>
    </>
  );
}
