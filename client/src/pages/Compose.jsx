import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PenSquare, Save, Send } from "lucide-react";
import PlatformSelector from "../components/composer/PlatformSelector.jsx";
import FormatSelector from "../components/composer/FormatSelector.jsx";
import CaptionEditor from "../components/composer/CaptionEditor.jsx";
import MediaUpload from "../components/composer/MediaUpload.jsx";
import FormatPackPanel from "../components/composer/FormatPackPanel.jsx";
import CropModal from "../components/composer/CropModal.jsx";
import VideoProcessModal from "../components/composer/VideoProcessModal.jsx";
import SchedulePicker from "../components/composer/SchedulePicker.jsx";
import AiPanel from "../components/composer/AiPanel.jsx";
import GraphicBuilderModal from "../components/graphicBuilder/GraphicBuilderModal.jsx";
import FullGraphicModal from "../components/graphicBuilder/FullGraphicModal.jsx";
import { useCreatePost, useUpdatePost, useUploadMedia, useAiSuggest, usePublishPost } from "../hooks/usePosts.js";
import { buildDefaultFormats, getDefaultFormat, getFormatConfig, getFormatsArray } from "../lib/postFormats.js";

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
  const editPost = location.state?.editPost ?? null;
  const attachedFile = location.state?.attachedFile ?? null;
  const isEditing = !!editPost;

  const initPlatforms = editPost?.platforms ?? prefill?.platforms ?? DEFAULT_PLATFORMS;
  const initCaptions = editPost?.captions
    ?? (prefill?.caption ? Object.fromEntries(initPlatforms.map((p) => [p, prefill.caption])) : {});
  const initFormats = editPost?.formats ?? buildDefaultFormats(initPlatforms);

  const [platforms, setPlatforms] = useState(initPlatforms);
  const [formats, setFormats] = useState(initFormats);
  const [captions, setCaptions] = useState(initCaptions);
  const [postMeta, setPostMeta] = useState(editPost?.meta ?? {});
  const [mediaAssets, setMediaAssets] = useState(editPost?.mediaAssets ?? []);
  const [cropVariants, setCropVariants] = useState({});
  const [cropTarget, setCropTarget] = useState(null);
  const [scheduledAt, setScheduledAt] = useState(
    editPost?.scheduledAt ? new Date(editPost.scheduledAt) : prefill?.scheduledAt ?? null
  );
  const [title, setTitle] = useState(editPost?.title ?? "");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [graphicBuilderOpen, setGraphicBuilderOpen] = useState(false);
  const [graphicPrefill, setGraphicPrefill] = useState(null);
  const [aiGraphicOpen, setAiGraphicOpen] = useState(false);
  const [videoTarget, setVideoTarget] = useState(null); // { asset, platform, format, ratio }

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const uploadMedia = useUploadMedia();
  const aiSuggest = useAiSuggest();
  const publishPost = usePublishPost();

  const isSaving = createPost.isPending || updatePost.isPending || publishPost.isPending;
  const isUploading = uploadMedia.isPending;

  // Auto-attach a graphic exported from the standalone Graphic Builder page
  useEffect(() => {
    if (!attachedFile) return;
    uploadMedia.mutateAsync([attachedFile]).then((uploaded) => {
      setMediaAssets((prev) => [...prev, ...uploaded]);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePlatformChange(newPlatforms) {
    setPlatforms(newPlatforms);
    const updatedCaptions = { ...captions };
    Object.keys(updatedCaptions).forEach((p) => {
      if (!newPlatforms.includes(p)) delete updatedCaptions[p];
    });
    setCaptions(updatedCaptions);
    setFormats((prev) => {
      const updated = {};
      newPlatforms.forEach((p) => {
        updated[p] = prev[p] ?? [getDefaultFormat(p)];
      });
      return updated;
    });
  }

  function handleFormatChange(platform, formatKey) {
    setFormats((prev) => {
      const current = getFormatsArray(prev, platform);
      const isSelected = current.includes(formatKey);
      // Keep at least one format selected per platform
      if (isSelected && current.length === 1) return prev;
      const next = isSelected
        ? current.filter((k) => k !== formatKey)
        : [...current, formatKey];
      return { ...prev, [platform]: next };
    });
  }

  function handleMetaChange(platform, meta) {
    setPostMeta((prev) => ({ ...prev, [platform]: meta }));
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
    // Remove any crop variants for this asset
    const assetId = asset.id;
    if (assetId) {
      setCropVariants((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((k) => {
          if (k.startsWith(assetId)) delete updated[k];
        });
        return updated;
      });
    }
  }

  function openVideoModal(asset, platform = null, format = null, ratio = null) {
    const targetPlatform = platform ?? platforms[0];
    const targetFormat = format ?? getFormatsArray(formats, targetPlatform)[0];
    const config = getFormatConfig(targetPlatform, targetFormat);
    const targetRatio = ratio ?? config?.recommendedRatio ?? config?.ratios?.[0] ?? "9:16";
    setVideoTarget({ asset, platform: targetPlatform, format: targetFormat, ratio: targetRatio });
  }

  function handleVideoApply({ platform, format, aspectRatio, variantUrl }) {
    const assetId = videoTarget?.asset?.id;
    if (assetId) {
      const key = `${assetId}__${platform}__${format}`;
      setCropVariants((prev) => ({ ...prev, [key]: variantUrl }));
    }
    setVideoTarget(null);
  }

  // Open crop modal — from thumbnail click (no specific target) or from format pack
  function openCropModal(asset, platform = null, format = null, ratio = null) {
    const targetPlatform = platform ?? platforms[0];
    const targetFormat = format ?? getFormatsArray(formats, targetPlatform)[0];
    const config = getFormatConfig(targetPlatform, targetFormat);
    const targetRatio = ratio ?? config?.recommendedRatio ?? config?.ratios?.[0] ?? "1:1";
    setCropTarget({ asset, platform: targetPlatform, format: targetFormat, ratio: targetRatio });
  }

  function handleCropApply({ platform, format, aspectRatio, variantUrl, cropData }) {
    const assetId = cropTarget?.asset?.id;
    if (assetId) {
      const key = `${assetId}__${platform}__${format}`;
      setCropVariants((prev) => ({ ...prev, [key]: variantUrl }));
    }
    setCropTarget(null);
  }

  function openGraphicBuilder(pf = null) {
    setGraphicPrefill(pf);
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

  async function handleAiGraphicUse(file) {
    setAiGraphicOpen(false);
    try {
      const uploaded = await uploadMedia.mutateAsync([file]);
      setMediaAssets((prev) => [...prev, ...uploaded]);
    } catch {
      setError("Failed to attach AI graphic. Please try again.");
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
    if (!hasCaption) { setError("Please write a caption for at least one platform."); return; }
    if (platforms.length === 0) { setError("Please select at least one platform."); return; }

    const payload = {
      title: title || null,
      captions,
      platforms,
      formats,
      meta: Object.keys(postMeta).length ? postMeta : null,
      status,
      scheduledAt: status === "SCHEDULED" ? scheduledAt : null,
      mediaAssets,
    };

    try {
      if (isEditing) {
        await updatePost.mutateAsync({ id: editPost.id, ...payload });
      } else {
        await createPost.mutateAsync(payload);
      }
      navigate("/posts");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save post.");
    }
  }

  async function publishNow() {
    setError(null);
    const hasCaption = platforms.some((p) => captions[p]?.trim());
    if (!hasCaption) { setError("Please write a caption for at least one platform."); return; }
    if (platforms.length === 0) { setError("Please select at least one platform."); return; }

    const payload = {
      title: title || null,
      captions,
      platforms,
      formats,
      meta: Object.keys(postMeta).length ? postMeta : null,
      status: "DRAFT",
      scheduledAt: null,
      mediaAssets,
    };

    try {
      let postId;
      if (isEditing) {
        await updatePost.mutateAsync({ id: editPost.id, ...payload });
        postId = editPost.id;
      } else {
        const post = await createPost.mutateAsync(payload);
        postId = post.id;
      }
      await publishPost.mutateAsync(postId);
      navigate("/posts");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to publish post.");
    }
  }

  return (
    <>
    {/* Video process modal */}
    {videoTarget && (
      <VideoProcessModal
        asset={videoTarget.asset}
        platform={videoTarget.platform}
        format={videoTarget.format}
        aspectRatio={videoTarget.ratio}
        onApply={handleVideoApply}
        onClose={() => setVideoTarget(null)}
      />
    )}

    {/* Crop modal */}
    {cropTarget && (
      <CropModal
        asset={cropTarget.asset}
        platform={cropTarget.platform}
        format={cropTarget.format}
        aspectRatio={cropTarget.ratio}
        onApply={handleCropApply}
        onClose={() => setCropTarget(null)}
      />
    )}

    <GraphicBuilderModal
      open={graphicBuilderOpen}
      onClose={() => setGraphicBuilderOpen(false)}
      onExport={handleGraphicExport}
      prefill={graphicPrefill}
    />
    <FullGraphicModal
      open={aiGraphicOpen}
      onClose={() => setAiGraphicOpen(false)}
      onUse={handleAiGraphicUse}
    />
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-8 py-4 lg:py-5 border-b border-gray-100 bg-[#F7F7F5]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
            <PenSquare className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold text-gray-900 font-display leading-none">{isEditing ? "Edit Post" : "New Post"}</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">{isEditing ? "Update your draft or scheduled post" : "Compose and schedule social content"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => save("DRAFT")} disabled={isSaving}
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50">
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save Draft</span>
          </button>
          <button type="button" onClick={() => save("SCHEDULED")} disabled={isSaving || !scheduledAt}
            title={!scheduledAt ? "Pick a date and time to schedule" : undefined}
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-40 shadow-sm"
            style={{ background: "var(--brand-primary)" }}>
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Schedule</span>
          </button>
          <button type="button" onClick={publishNow} disabled={isSaving}
            className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-[13px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-sm bg-emerald-600 hover:bg-emerald-700">
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Publish</span>
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

          <Section title="Post Title (optional)">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunday Service — May 18"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
          </Section>

          <Section title="Platforms">
            <PlatformSelector selected={platforms} onChange={handlePlatformChange} />
          </Section>

          {platforms.length > 0 && (
            <Section title="Format">
              <FormatSelector
                platforms={platforms}
                formats={formats}
                mediaAssets={mediaAssets}
                onFormatChange={handleFormatChange}
              />
            </Section>
          )}

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

          {platforms.length > 0 && (
            <Section title="Caption">
              <CaptionEditor
                platforms={platforms}
                captions={captions}
                onChange={setCaptions}
                formats={formats}
                postMeta={postMeta}
                onMetaChange={handleMetaChange}
              />
            </Section>
          )}

          <Section title="Media">
            <MediaUpload
              assets={mediaAssets}
              onAdd={handleMediaDrop}
              onRemove={handleRemoveMedia}
              isUploading={isUploading}
              onOpenGraphicBuilder={() => openGraphicBuilder()}
              onOpenAiGenerate={() => setAiGraphicOpen(true)}
              onCropAsset={(asset) => openCropModal(asset)}
              onProcessVideo={(asset) => openVideoModal(asset)}
              cropVariants={cropVariants}
            />
            {/* Format pack panel — shown when multiple ratios are needed */}
            {platforms.length > 0 && mediaAssets.length > 0 && (
              <FormatPackPanel
                platforms={platforms}
                formats={formats}
                assets={mediaAssets}
                cropVariants={cropVariants}
                onCropRequest={(asset, platform, format, ratio) =>
                  openCropModal(asset, platform, format, ratio)
                }
              />
            )}
          </Section>

          <Section title="Schedule">
            <SchedulePicker scheduledAt={scheduledAt} onChange={setScheduledAt} />
          </Section>
        </div>
      </div>
    </div>
    </>
  );
}
