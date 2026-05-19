import { useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Check, RefreshCw, Sparkles } from "lucide-react";
import { useSettingsQuery, useUpdateSettings, useUploadLogo } from "../../hooks/useSettings.js";
import { cn } from "../../lib/utils.js";

const FONTS = [
  { label: "Sora", value: "Sora" },
  { label: "Inter", value: "Inter" },
  { label: "DM Sans", value: "DM Sans" },
  { label: "Nunito", value: "Nunito" },
  { label: "Poppins", value: "Poppins" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Lato", value: "Lato" },
  { label: "Raleway", value: "Raleway" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Merriweather", value: "Merriweather" },
];

function loadGoogleFont(family) {
  const id = `gfont-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

function getLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function autoTextColor(bg) {
  return getLuminance(bg) > 0.35 ? "#111111" : "#ffffff";
}

function ColorSwatch({ label, value, onChange }) {
  const inputRef = useRef(null);
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-gray-600">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors group"
      >
        <span
          className="h-7 w-7 rounded-lg flex-shrink-0 border border-black/10 shadow-sm"
          style={{ background: value }}
        />
        <span className="text-[13px] font-mono text-gray-700 flex-1 text-left uppercase">
          {value}
        </span>
        <span className="text-[11px] text-gray-400 group-hover:text-gray-600">Change</span>
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </button>
    </div>
  );
}

function LogoUploadZone({ label, type, currentUrl, onUpload, isUploading }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: isUploading,
    onDrop: ([file]) => file && onUpload({ type, file }),
  });

  const src = currentUrl?.startsWith("/")
    ? `http://localhost:3001${currentUrl}`
    : currentUrl;

  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-gray-600">{label}</label>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 overflow-hidden",
          isDragActive ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-gray-50 hover:border-gray-300",
          "h-24"
        )}
      >
        <input {...getInputProps()} />
        {src ? (
          <>
            <img src={src} alt={label} className="h-full w-full object-contain p-3" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
              <span className="opacity-0 hover:opacity-100 text-[11px] text-white font-medium">
                Replace
              </span>
            </div>
          </>
        ) : isUploading ? (
          <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
        ) : (
          <>
            <Upload className="h-5 w-5 text-gray-400 mb-1" />
            <span className="text-[11px] text-gray-400">Drop or click</span>
          </>
        )}
      </div>
    </div>
  );
}

function LivePreview({ primary, font, orgName }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: primary }}
        >
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <span
          className="text-[13px] font-semibold"
          style={{ fontFamily: `'${font}', system-ui, sans-serif`, color: primary }}
        >
          {orgName || "Your Church"}
        </span>
      </div>
      <div className="p-4 space-y-3">
        <p
          className="text-[13px] font-semibold text-gray-900"
          style={{ fontFamily: `'${font}', system-ui, sans-serif` }}
        >
          Welcome to our community
        </p>
        <p className="text-[12px] text-gray-500 leading-relaxed">
          This is how your body text will look with the selected font.
        </p>
        <button
          className="px-4 py-1.5 rounded-lg text-[12px] font-semibold"
          style={{
            background: primary,
            color: autoTextColor(primary),
            fontFamily: `'${font}', system-ui, sans-serif`,
          }}
        >
          Schedule Post
        </button>
      </div>
    </div>
  );
}

export default function BrandingPanel() {
  const { data: saved, isLoading } = useSettingsQuery();
  const update = useUpdateSettings();
  const uploadLogo = useUploadLogo();

  const [form, setForm] = useState(null);
  const [saved_, setSaved_] = useState(false);

  // Initialise form from DB on first load
  useEffect(() => {
    if (saved && !form) {
      setForm({
        orgName: saved.orgName ?? "",
        brandPrimaryColor: saved.brandPrimaryColor ?? "#6366f1",
        brandSecondaryColor: saved.brandSecondaryColor ?? "#8b5cf6",
        brandFontFamily: saved.brandFontFamily ?? "Sora",
      });
    }
  }, [saved, form]);

  // Load selected font for preview
  useEffect(() => {
    if (form?.brandFontFamily) loadGoogleFont(form.brandFontFamily);
  }, [form?.brandFontFamily]);

  // Live-apply primary color to CSS var for instant preview
  useEffect(() => {
    if (form?.brandPrimaryColor) {
      document.documentElement.style.setProperty("--brand-primary", form.brandPrimaryColor);
      document.documentElement.style.setProperty(
        "--brand-text-on-primary",
        autoTextColor(form.brandPrimaryColor)
      );
    }
  }, [form?.brandPrimaryColor]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    await update.mutateAsync({
      ...form,
      brandTextOnPrimary: autoTextColor(form.brandPrimaryColor),
    });
    setSaved_(true);
    setTimeout(() => setSaved_(false), 2000);
  }

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[15px] font-semibold text-gray-900 font-display">Branding</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Changes apply live across the app for all users in your org.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-8 items-start">
        <div className="space-y-6">
          {/* Org display name */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-gray-600">Organization Display Name</label>
            <input
              type="text"
              value={form.orgName}
              onChange={(e) => setField("orgName", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14px] text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Colors */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">Colors</h3>
            <ColorSwatch
              label="Primary (buttons, active states)"
              value={form.brandPrimaryColor}
              onChange={(v) => setField("brandPrimaryColor", v)}
            />
            <ColorSwatch
              label="Secondary (accents)"
              value={form.brandSecondaryColor}
              onChange={(v) => setField("brandSecondaryColor", v)}
            />
            <p className="text-[11px] text-gray-400">
              Text-on-primary color is computed automatically for accessibility.
            </p>
          </div>

          {/* Font */}
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">Font Family</h3>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map(({ label, value }) => {
                loadGoogleFont(value);
                const active = form.brandFontFamily === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setField("brandFontFamily", value)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl border text-left transition-all",
                      active
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <span
                      className="text-[14px] font-medium block"
                      style={{ fontFamily: `'${value}', system-ui` }}
                    >
                      {label}
                    </span>
                    <span className="text-[10px] text-gray-400 font-sans">Aa Bb Cc</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logos */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">Logos</h3>
            <div className="grid grid-cols-3 gap-3">
              <LogoUploadZone
                label="Icon (sidebar)"
                type="icon"
                currentUrl={saved?.logoIconUrl}
                onUpload={(args) => uploadLogo.mutate(args)}
                isUploading={uploadLogo.isPending}
              />
              <LogoUploadZone
                label="Full logo (light)"
                type="full"
                currentUrl={saved?.logoFullUrl}
                onUpload={(args) => uploadLogo.mutate(args)}
                isUploading={uploadLogo.isPending}
              />
              <LogoUploadZone
                label="Full logo (dark bg)"
                type="dark"
                currentUrl={saved?.logoDarkUrl}
                onUpload={(args) => uploadLogo.mutate(args)}
                isUploading={uploadLogo.isPending}
              />
            </div>
            <p className="text-[11px] text-gray-400">
              PNG or SVG recommended. Max 5 MB. Icon logo shows in the sidebar.
            </p>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-3 sticky top-6">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">Live Preview</h3>
          <LivePreview
            primary={form.brandPrimaryColor}
            font={form.brandFontFamily}
            orgName={form.orgName}
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={update.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
          style={{ background: "var(--brand-primary)" }}
        >
          {update.isPending ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : saved_ ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
          {saved_ ? "Saved!" : "Save Branding"}
        </button>
        {update.isError && (
          <span className="text-[12px] text-red-500">Failed to save. Try again.</span>
        )}
      </div>
    </div>
  );
}
