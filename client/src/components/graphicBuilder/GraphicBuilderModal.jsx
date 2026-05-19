import { useState, useEffect, useRef, useCallback } from "react";
import { fabric } from "fabric";
import { HexColorPicker } from "react-colorful";
import {
  X, Undo2, Redo2, Download, RotateCcw, Plus, Trash2,
  AlignLeft, AlignCenter, AlignRight, Sparkles,
  Image as ImageIcon, Palette, Type, Monitor, ChevronLeft,
  Search, Loader2,
} from "lucide-react";
import { useOrgSettings } from "../../hooks/useOrgSettings.js";
import { PLATFORM_SIZES, TEMPLATE_META, FONT_OPTIONS, GRADIENT_DIRECTIONS } from "./constants.js";
import { applyTemplate } from "./templates.js";
import { cn } from "../../lib/utils.js";
import { useAuth } from "@clerk/clerk-react";
import api from "../../lib/api.js";

const EXPORT_MULT = 2;

// Curated church-relevant Iconify icons (prefix:name pairs)
const CURATED_ICONS = [
  { prefix: "mdi", name: "cross", label: "Cross" },
  { prefix: "mdi", name: "dove", label: "Dove" },
  { prefix: "mdi", name: "heart", label: "Heart" },
  { prefix: "mdi", name: "star-four-points", label: "Star" },
  { prefix: "mdi", name: "book-open-variant", label: "Bible" },
  { prefix: "mdi", name: "hands-pray", label: "Prayer" },
  { prefix: "mdi", name: "fire", label: "Flame" },
  { prefix: "mdi", name: "music-note", label: "Music" },
  { prefix: "mdi", name: "flower", label: "Flower" },
  { prefix: "mdi", name: "leaf", label: "Leaf" },
  { prefix: "mdi", name: "crown", label: "Crown" },
  { prefix: "mdi", name: "infinity", label: "Infinity" },
  { prefix: "mdi", name: "water", label: "Water" },
  { prefix: "mdi", name: "candle", label: "Candle" },
  { prefix: "mdi", name: "church", label: "Church" },
  { prefix: "mdi", name: "account-group", label: "People" },
];

function iconUrl(prefix, name, color = "#ffffff") {
  const encoded = encodeURIComponent(color);
  return `https://api.iconify.design/${prefix}/${name}.svg?color=${encoded}&width=80&height=80`;
}

// ── Color swatch + popover ─────────────────────────────────────────────────
function ColorSwatch({ color, onChange, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {label && <p className="text-[11px] text-gray-400 mb-1">{label}</p>}
      <button
        onClick={() => setOpen(!open)}
        className="h-8 w-8 rounded-lg border-2 border-white shadow-sm ring-1 ring-gray-200 flex-shrink-0"
        style={{ background: color }}
        title={color}
      />
      {open && (
        <div className="absolute z-50 top-10 left-0 bg-white rounded-xl shadow-xl p-3 border border-gray-100">
          <HexColorPicker color={color} onChange={onChange} />
          <input
            type="text"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="w-full mt-2 text-[11px] border border-gray-200 rounded-lg px-2 py-1 font-mono"
          />
        </div>
      )}
    </div>
  );
}

function BrandSwatches({ colors, onSelect }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="h-6 w-6 rounded-md border border-white ring-1 ring-gray-200 shadow-sm flex-shrink-0 hover:scale-110 transition-transform"
          style={{ background: c }}
          title={c}
        />
      ))}
    </div>
  );
}

function SectionHead({ label }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-2">{label}</p>;
}

// ── Panel back button ──────────────────────────────────────────────────────
function BackButton({ onBack, label = "Background" }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-700 transition-colors mb-3 -mt-1"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      Back to {label}
    </button>
  );
}

// ── Template thumbnail ─────────────────────────────────────────────────────
function TemplateThumbnail({ tpl, selected, onClick }) {
  const gradients = {
    scripture:    "linear-gradient(135deg, #6366f1, #7c3aed)",
    event:        "linear-gradient(135deg, #059669, #0d9488)",
    sermon:       "linear-gradient(135deg, #1f2937, #111827)",
    announcement: "linear-gradient(135deg, #f59e0b, #ea580c)",
    thisSunday:   "#ffffff",
    blank:        "#f3f4f6",
  };
  const bg = gradients[tpl.key];
  const isDark = !["thisSunday", "blank"].includes(tpl.key);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl overflow-hidden border-2 transition-all duration-150 text-left",
        selected ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-200 hover:border-gray-300"
      )}
    >
      <div className="h-20 flex flex-col items-center justify-center gap-1 px-2" style={{ background: bg }}>
        <span className="text-xl">{tpl.emoji}</span>
        <p className={cn("text-[10px] font-bold text-center leading-tight", isDark ? "text-white" : "text-gray-700")}>
          {tpl.label}
        </p>
      </div>
      <div className="px-2 py-1.5 bg-white">
        <p className="text-[10px] text-gray-400 truncate">{tpl.desc}</p>
      </div>
    </button>
  );
}

// ── Background controls ────────────────────────────────────────────────────
function BackgroundControls({ bgType, setBgType, bgSolid, setBgSolid, bgGradient, setBgGradient, brandColors, onApplyBg, onPhotoUpload }) {
  const fileRef = useRef(null);

  return (
    <div className="space-y-4">
      <div>
        <SectionHead label="Background type" />
        <div className="grid grid-cols-2 gap-1.5">
          {["solid", "gradient", "photo", "pattern"].map((t) => (
            <button
              key={t}
              onClick={() => { setBgType(t); onApplyBg(t); }}
              className={cn("py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all", bgType === t ? "text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}
              style={bgType === t ? { background: "var(--brand-primary)" } : {}}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {bgType === "solid" && (
        <div>
          <SectionHead label="Color" />
          <div className="flex items-center gap-3">
            <ColorSwatch color={bgSolid} onChange={(c) => { setBgSolid(c); onApplyBg("solid", { solid: c }); }} />
            <BrandSwatches colors={brandColors} onSelect={(c) => { setBgSolid(c); onApplyBg("solid", { solid: c }); }} />
          </div>
        </div>
      )}

      {bgType === "gradient" && (
        <div className="space-y-3">
          <SectionHead label="Gradient" />
          <div className="flex gap-3 items-end">
            <ColorSwatch label="Start" color={bgGradient.color1} onChange={(c) => { const g = { ...bgGradient, color1: c }; setBgGradient(g); onApplyBg("gradient", { gradient: g }); }} />
            <ColorSwatch label="End" color={bgGradient.color2} onChange={(c) => { const g = { ...bgGradient, color2: c }; setBgGradient(g); onApplyBg("gradient", { gradient: g }); }} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 mb-1">Direction</p>
            <div className="flex gap-1.5">
              {GRADIENT_DIRECTIONS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => { const g = { ...bgGradient, dir: d }; setBgGradient(g); onApplyBg("gradient", { gradient: g }); }}
                  className={cn("flex-1 py-1 rounded text-[10px] font-medium transition-all", bgGradient.dir?.key === d.key ? "text-white" : "bg-gray-100 text-gray-500")}
                  style={bgGradient.dir?.key === d.key ? { background: "var(--brand-primary)" } : {}}
                >
                  {d.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          <BrandSwatches colors={brandColors} onSelect={(c) => { const g = { ...bgGradient, color1: c }; setBgGradient(g); onApplyBg("gradient", { gradient: g }); }} />
        </div>
      )}

      {bgType === "photo" && (
        <div className="space-y-3">
          <SectionHead label="Photo background" />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-[12px] text-gray-500 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            Upload photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) onPhotoUpload(e.target.files[0]); }} />
        </div>
      )}

      {bgType === "pattern" && (
        <div>
          <SectionHead label="Pattern" />
          <div className="grid grid-cols-3 gap-2">
            {["dots", "lines", "crosses"].map((p) => (
              <button key={p} onClick={() => onApplyBg("pattern", { pattern: p })} className="h-14 rounded-xl border border-gray-200 flex items-center justify-center text-[11px] text-gray-500 hover:border-gray-300 transition-colors capitalize bg-white">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assets panel (icons + photos) ──────────────────────────────────────────
function AssetsPanel({ iconColor, setIconColor, onAddIcon, onAddImageFile }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const fileRef = useRef(null);

  async function search() {
    if (!query.trim()) { setResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query.trim())}&limit=16`);
      const data = await res.json();
      setResults(data.icons ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  const displayIcons = results ?? CURATED_ICONS.map((ic) => `${ic.prefix}:${ic.name}`);

  return (
    <div className="space-y-4 pt-4 border-t border-gray-100">
      <SectionHead label="Icons & Images" />

      {/* Add image file */}
      <div>
        <p className="text-[11px] text-gray-500 mb-2">Add image to canvas</p>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-[12px] text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Upload image or graphic
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) onAddImageFile(e.target.files[0]); }} />
      </div>

      {/* Icon picker */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[11px] text-gray-500 flex-1">Icons</p>
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] text-gray-400">Color:</p>
            <ColorSwatch color={iconColor} onChange={setIconColor} />
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-1.5 mb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search icons…"
            className="flex-1 text-[11px] rounded-lg border border-gray-200 px-2 py-1.5 outline-none focus:border-indigo-400"
          />
          <button
            onClick={search}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" /> : <Search className="h-3.5 w-3.5 text-gray-500" />}
          </button>
        </div>

        {/* Icon grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {displayIcons.map((icon) => {
            const [prefix, name] = icon.split(":");
            const curated = CURATED_ICONS.find((c) => `${c.prefix}:${c.name}` === icon);
            return (
              <button
                key={icon}
                onClick={() => onAddIcon(prefix, name)}
                title={curated?.label ?? name}
                className="aspect-square rounded-lg border border-gray-100 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center p-1.5 group"
              >
                <img
                  src={`https://api.iconify.design/${prefix}/${name}.svg?color=%23${iconColor.replace("#", "")}&width=32&height=32`}
                  alt={name}
                  className="w-6 h-6 object-contain"
                  crossOrigin="anonymous"
                  style={{ filter: iconColor === "#ffffff" ? "invert(0)" : undefined }}
                />
              </button>
            );
          })}
        </div>
        {results?.length === 0 && (
          <p className="text-[11px] text-gray-400 text-center mt-2">No icons found for "{query}"</p>
        )}
        <p className="text-[10px] text-gray-300 mt-2 text-center">200k+ icons via Iconify · no API key needed</p>
      </div>

      {/* Photo note */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2.5">
        <p className="text-[11px] font-semibold text-indigo-700 mb-1">Free stock photos</p>
        <p className="text-[10px] text-indigo-500 leading-relaxed">
          Use "Upload photo" in the Background tab to add a photo background. For searchable stock photos, Unsplash and Pexels offer free APIs — ask to add photo search in a future update.
        </p>
      </div>
    </div>
  );
}

// ── Text controls ──────────────────────────────────────────────────────────
function TextControls({ obj, canvas, brandColors, onAiSuggest, onDelete, onBack }) {
  const [text, setText] = useState(obj?.text ?? "");
  const [fontSize, setFontSize] = useState(Math.round(obj?.fontSize ?? 24));
  const [fontFamily, setFontFamily] = useState(obj?.fontFamily ?? "Sora");
  const [fontWeight, setFontWeight] = useState(obj?.fontWeight ?? "normal");
  const [align, setAlign] = useState(obj?.textAlign ?? "center");
  const [color, setColor] = useState(typeof obj?.fill === "string" ? obj.fill : "#ffffff");
  const [shadow, setShadow] = useState(!!obj?.shadow);

  useEffect(() => {
    if (!obj) return;
    setText(obj.text ?? "");
    setFontSize(Math.round(obj.fontSize ?? 24));
    setFontFamily(obj.fontFamily ?? "Sora");
    setFontWeight(obj.fontWeight ?? "normal");
    setAlign(obj.textAlign ?? "center");
    setColor(typeof obj.fill === "string" ? obj.fill : "#ffffff");
    setShadow(!!obj.shadow);
  }, [obj]);

  function update(props) {
    if (!obj || !canvas) return;
    obj.set(props);
    canvas.renderAll();
  }

  return (
    <div className="space-y-4">
      <BackButton onBack={onBack} />
      <div className="flex items-center justify-between">
        <SectionHead label={`Text: ${obj?.name ?? "Block"}`} />
        <button onClick={onDelete} className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); update({ text: e.target.value }); }}
        rows={3}
        className="w-full text-[12px] rounded-xl border border-gray-200 px-3 py-2 resize-none outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
      <button
        onClick={onAiSuggest}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        Suggest text with AI
      </button>

      <div>
        <SectionHead label="Font" />
        <select value={fontFamily} onChange={(e) => { setFontFamily(e.target.value); update({ fontFamily: e.target.value }); }} className="w-full text-[12px] rounded-lg border border-gray-200 px-2 py-1.5 outline-none focus:border-indigo-400">
          {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-gray-400">Size</p>
          <span className="text-[11px] font-semibold text-gray-600">{fontSize}px</span>
        </div>
        <input type="range" min={8} max={120} value={fontSize} onChange={(e) => { const s = +e.target.value; setFontSize(s); update({ fontSize: s }); }} className="w-full accent-indigo-500" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <SectionHead label="Weight" />
          <select value={fontWeight} onChange={(e) => { setFontWeight(e.target.value); update({ fontWeight: e.target.value }); }} className="w-full text-[12px] rounded-lg border border-gray-200 px-2 py-1.5 outline-none focus:border-indigo-400">
            <option value="normal">Regular</option>
            <option value="500">Medium</option>
            <option value="600">SemiBold</option>
            <option value="bold">Bold</option>
          </select>
        </div>
        <div>
          <SectionHead label="Align" />
          <div className="flex gap-0.5">
            {[["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]].map(([a, Icon]) => (
              <button key={a} onClick={() => { setAlign(a); update({ textAlign: a }); }}
                className={cn("p-1.5 rounded-lg transition-colors", align === a ? "text-white" : "text-gray-400 hover:text-gray-700")}
                style={align === a ? { background: "var(--brand-primary)" } : {}}>
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <SectionHead label="Color" />
        <div className="flex items-center gap-3">
          <ColorSwatch color={color} onChange={(c) => { setColor(c); update({ fill: c }); }} />
          <BrandSwatches colors={brandColors} onSelect={(c) => { setColor(c); update({ fill: c }); }} />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={shadow} onChange={(e) => { setShadow(e.target.checked); update({ shadow: e.target.checked ? new fabric.Shadow({ color: "rgba(0,0,0,0.4)", blur: 6, offsetX: 2, offsetY: 2 }) : null }); }} className="rounded accent-indigo-500" />
        <span className="text-[12px] text-gray-600">Text shadow</span>
      </label>
    </div>
  );
}

// ── Canvas image controls ──────────────────────────────────────────────────
function CanvasImageControls({ obj, canvas, onDelete, onBack }) {
  const [opacity, setOpacity] = useState(Math.round((obj?.opacity ?? 1) * 100));

  useEffect(() => {
    if (obj) setOpacity(Math.round((obj.opacity ?? 1) * 100));
  }, [obj]);

  function update(props) {
    if (!obj || !canvas) return;
    obj.set(props);
    canvas.renderAll();
  }

  return (
    <div className="space-y-4">
      <BackButton onBack={onBack} />
      <div className="flex items-center justify-between">
        <SectionHead label={obj?.name ?? "Image"} />
        <button onClick={onDelete} className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-gray-400">Drag to reposition. Use handles to resize.</p>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-gray-400">Opacity</p>
          <span className="text-[11px] font-semibold text-gray-600">{opacity}%</span>
        </div>
        <input
          type="range" min={10} max={100} value={opacity}
          onChange={(e) => { const v = +e.target.value; setOpacity(v); update({ opacity: v / 100 }); }}
          className="w-full accent-indigo-500"
        />
      </div>

      <div>
        <p className="text-[11px] text-gray-400 mb-2">Arrange</p>
        <div className="flex gap-1.5">
          <button onClick={() => { canvas?.bringToFront(obj); canvas?.renderAll(); }} className="flex-1 py-1.5 rounded-lg bg-gray-100 text-[11px] text-gray-600 hover:bg-gray-200 transition-colors">Front</button>
          <button onClick={() => { canvas?.sendToBack(obj); canvas?.renderAll(); }} className="flex-1 py-1.5 rounded-lg bg-gray-100 text-[11px] text-gray-600 hover:bg-gray-200 transition-colors">Back</button>
        </div>
      </div>
    </div>
  );
}

// ── Logo controls ──────────────────────────────────────────────────────────
function LogoControls({ obj, canvas, settings, onBack }) {
  const positions = [
    { key: "tl", label: "↖ Top left" }, { key: "tr", label: "↗ Top right" },
    { key: "bl", label: "↙ Bottom left" }, { key: "br", label: "↘ Bottom right" },
    { key: "bc", label: "↓ Bottom center" },
  ];

  function snap(pos) {
    if (!obj || !canvas) return;
    const w = canvas.getWidth(), h = canvas.getHeight();
    const ow = obj.getScaledWidth(), oh = obj.getScaledHeight();
    const pad = 16;
    const pts = { tl: [pad, pad], tr: [w - ow - pad, pad], bl: [pad, h - oh - pad], br: [w - ow - pad, h - oh - pad], bc: [(w - ow) / 2, h - oh - pad] };
    obj.set({ left: pts[pos][0], top: pts[pos][1] });
    canvas.renderAll();
  }

  return (
    <div className="space-y-4">
      <BackButton onBack={onBack} />
      <SectionHead label="Logo" />
      {(!settings?.logoFullUrl && !settings?.logoIconUrl) && (
        <p className="text-[12px] text-gray-400">No logo uploaded. Go to Settings → Branding.</p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {positions.map((p) => (
          <button key={p.key} onClick={() => snap(p.key)} className="py-1.5 rounded-lg text-[11px] text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
            {p.label}
          </button>
        ))}
      </div>
      <div>
        <SectionHead label="Size" />
        <input type="range" min={20} max={120} defaultValue={50}
          onChange={(e) => { if (!obj || !canvas) return; obj.scaleToWidth(+e.target.value); canvas.renderAll(); }}
          className="w-full accent-indigo-500" />
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────
export default function GraphicBuilderModal({ open, onClose, onExport, prefill }) {
  const settings = useOrgSettings();
  const { getToken } = useAuth();

  const [templateKey, setTemplateKey] = useState(prefill?.template ?? "scripture");
  const [sizeKey, setSizeKey] = useState("square");
  const [selectedObj, setSelectedObj] = useState(null);
  const [bgType, setBgType] = useState("solid");
  const [bgSolid, setBgSolid] = useState(settings?.primaryColor ?? "#6366f1");
  const [bgGradient, setBgGradient] = useState({ color1: settings?.primaryColor ?? "#6366f1", color2: settings?.secondaryColor ?? "#818cf8", dir: GRADIENT_DIRECTIONS[0] });
  const [iconColor, setIconColor] = useState("#ffffff");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mobilePanel, setMobilePanel] = useState("templates");

  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const historyRef = useRef({ states: [], index: -1 });
  const brandRef = useRef(null);
  const imageFileRef = useRef(null);

  const brandColors = [settings?.primaryColor ?? "#6366f1", settings?.secondaryColor ?? "#818cf8", "#ffffff", "#000000", "#f3f4f6"].filter(Boolean);

  const brand = {
    primaryColor: settings?.primaryColor ?? "#6366f1",
    secondaryColor: settings?.secondaryColor ?? "#818cf8",
    fontFamily: settings?.fontFamily ?? "Sora",
    logoUrl: settings?.logoFullUrl || settings?.logoIconUrl,
  };
  brandRef.current = brand;

  // ── Canvas init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !canvasElRef.current) return;
    if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null; }

    const size = PLATFORM_SIZES[sizeKey];
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: size.displayW, height: size.displayH, backgroundColor: "#ffffff", selection: true,
    });
    fabricRef.current = canvas;

    canvas.on("selection:created", (e) => setSelectedObj(e.selected?.[0] ?? null));
    canvas.on("selection:updated", (e) => setSelectedObj(e.selected?.[0] ?? null));
    canvas.on("selection:cleared", () => setSelectedObj(null));
    canvas.on("object:modified", saveHistory);
    canvas.on("object:added", saveHistory);

    applyTemplate(templateKey, brandRef.current, canvas, size);
    if (prefill?.text) {
      setTimeout(() => {
        const obj = canvas.getObjects().find((o) => o.id === "primary-text");
        if (obj) { obj.set({ text: prefill.text }); canvas.renderAll(); }
      }, 100);
    }
    saveHistory();
    return () => { canvas.dispose(); fabricRef.current = null; };
  }, [open]); // eslint-disable-line

  function saveHistory() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const state = JSON.stringify(canvas.toJSON(["id", "customType", "name"]));
    const h = historyRef.current;
    h.states = [...h.states.slice(0, h.index + 1), state];
    h.index = h.states.length - 1;
    setCanUndo(h.index > 0);
    setCanRedo(false);
  }

  function undo() {
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index--;
    fabricRef.current?.loadFromJSON(h.states[h.index], () => { fabricRef.current?.renderAll(); setCanUndo(h.index > 0); setCanRedo(true); setSelectedObj(null); });
  }

  function redo() {
    const h = historyRef.current;
    if (h.index >= h.states.length - 1) return;
    h.index++;
    fabricRef.current?.loadFromJSON(h.states[h.index], () => { fabricRef.current?.renderAll(); setCanUndo(true); setCanRedo(h.index < h.states.length - 1); setSelectedObj(null); });
  }

  function deselect() {
    fabricRef.current?.discardActiveObject();
    fabricRef.current?.renderAll();
    setSelectedObj(null);
  }

  function changeTemplate(key) {
    setTemplateKey(key);
    const canvas = fabricRef.current;
    if (!canvas) return;
    applyTemplate(key, brandRef.current, canvas, PLATFORM_SIZES[sizeKey]);
    setSelectedObj(null);
    setTimeout(saveHistory, 50);
  }

  function changeSize(key) {
    setSizeKey(key);
    const canvas = fabricRef.current;
    if (!canvas) return;
    const size = PLATFORM_SIZES[key];
    canvas.setWidth(size.displayW);
    canvas.setHeight(size.displayH);
    applyTemplate(templateKey, brandRef.current, canvas, size);
    setSelectedObj(null);
    setTimeout(saveHistory, 50);
  }

  function applyBg(type, opts = {}) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (type === "solid") {
      const c = opts.solid ?? bgSolid;
      canvas.setBackgroundColor(c, canvas.renderAll.bind(canvas));
      canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
    } else if (type === "gradient") {
      const g = opts.gradient ?? bgGradient;
      const w = canvas.getWidth(), h = canvas.getHeight();
      const dir = g.dir ?? GRADIENT_DIRECTIONS[0];
      const gradient = new fabric.Gradient({ type: "linear", coords: { x1: dir.x1 * w, y1: dir.y1 * h, x2: dir.x2 * w, y2: dir.y2 * h }, colorStops: [{ offset: 0, color: g.color1 }, { offset: 1, color: g.color2 }] });
      canvas.setBackgroundColor(gradient, canvas.renderAll.bind(canvas));
      canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
    } else if (type === "photo" && opts.url) {
      fabric.Image.fromURL(opts.url, (img) => {
        img.scaleToWidth(canvas.getWidth());
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), { originX: "center", originY: "center", left: canvas.getWidth() / 2, top: canvas.getHeight() / 2 });
      });
    } else if (type === "pattern") {
      canvas.setBackgroundColor("#f9fafb", canvas.renderAll.bind(canvas));
      canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
    }
  }

  function handlePhotoUpload(file) {
    applyBg("photo", { url: URL.createObjectURL(file) });
  }

  function addTextBlock() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const textCount = canvas.getObjects().filter((o) => o.customType === "text").length;
    if (textCount >= 4) return;
    const t = new fabric.Textbox("New text block", {
      left: 40, top: 40 + textCount * 30,
      width: canvas.getWidth() - 80,
      fontSize: 24, fontFamily: brandRef.current?.fontFamily ?? "Sora",
      fill: "#ffffff", textAlign: "center",
      id: `text-${Date.now()}`, customType: "text", name: "Text",
    });
    canvas.add(t);
    canvas.setActiveObject(t);
    setSelectedObj(t);
    canvas.renderAll();
  }

  function addImageToCanvas(file) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const url = URL.createObjectURL(file);
    fabric.Image.fromURL(url, (img) => {
      if (!img) return;
      const maxW = Math.min(canvas.getWidth() * 0.6, 220);
      if (img.width > maxW) img.scaleToWidth(maxW);
      img.set({ left: 40, top: 40, id: `img-${Date.now()}`, customType: "canvasImage", name: "Image" });
      canvas.add(img);
      canvas.setActiveObject(img);
      setSelectedObj(img);
      canvas.renderAll();
    });
  }

  function addIconToCanvas(prefix, name) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const url = `https://api.iconify.design/${prefix}/${name}.svg?color=${encodeURIComponent(iconColor)}&width=80&height=80`;
    fabric.Image.fromURL(url, (img) => {
      if (!img) return;
      img.scaleToWidth(80);
      img.set({ left: canvas.getWidth() / 2 - 40, top: canvas.getHeight() / 2 - 40, id: `icon-${Date.now()}`, customType: "canvasImage", name: `Icon: ${name}` });
      canvas.add(img);
      canvas.setActiveObject(img);
      setSelectedObj(img);
      canvas.renderAll();
    }, { crossOrigin: "anonymous" });
  }

  function deleteSelected() {
    const canvas = fabricRef.current;
    if (!canvas || !selectedObj) return;
    canvas.remove(selectedObj);
    setSelectedObj(null);
    canvas.renderAll();
    saveHistory();
  }

  function resetCanvas() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    applyTemplate(templateKey, brandRef.current, canvas, PLATFORM_SIZES[sizeKey]);
    setSelectedObj(null);
    setTimeout(saveHistory, 50);
  }

  async function handleAiSuggest() {
    if (!selectedObj) return;
    try {
      const token = await getToken();
      const res = await api.post("/ai/suggest", { topic: `Short punchy text for a "${selectedObj.name || "text block"}" in a social media graphic`, platforms: ["instagram"], maxTokens: 80 }, { headers: { Authorization: `Bearer ${token}` } });
      const suggestion = res.data?.suggestion || res.data?.caption || "";
      const clean = suggestion.replace(/#\w+/g, "").replace(/\n\n[\s\S]*/g, "").trim();
      if (clean && fabricRef.current) { selectedObj.set({ text: clean }); fabricRef.current.renderAll(); }
    } catch { /* silently fail */ }
  }

  async function handleExport() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setExporting(true);
    try {
      canvas.discardActiveObject();
      canvas.renderAll();
      const dataUrl = canvas.toDataURL({ format: "png", multiplier: EXPORT_MULT });
      const arr = dataUrl.split(","), mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]), u8 = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
      const file = new File([u8], `graphic-${Date.now()}.png`, { type: mime });
      onExport(file);
      onClose();
    } finally { setExporting(false); }
  }

  const isTextSelected = selectedObj?.customType === "text";
  const isLogoSelected = selectedObj?.customType === "logo";
  const isImageSelected = selectedObj?.customType === "canvasImage";
  const currentSize = PLATFORM_SIZES[sizeKey];

  // Controls panel content (shared between desktop right panel and mobile drawer)
  function ControlsContent() {
    if (isTextSelected) return <TextControls obj={selectedObj} canvas={fabricRef.current} brandColors={brandColors} onAiSuggest={handleAiSuggest} onDelete={deleteSelected} onBack={deselect} />;
    if (isLogoSelected) return <LogoControls obj={selectedObj} canvas={fabricRef.current} settings={settings} onBack={deselect} />;
    if (isImageSelected) return <CanvasImageControls obj={selectedObj} canvas={fabricRef.current} onDelete={deleteSelected} onBack={deselect} />;
    return (
      <>
        <BackgroundControls bgType={bgType} setBgType={setBgType} bgSolid={bgSolid} setBgSolid={setBgSolid} bgGradient={bgGradient} setBgGradient={setBgGradient} brandColors={brandColors} onApplyBg={applyBg} onPhotoUpload={handlePhotoUpload} />
        <AssetsPanel iconColor={iconColor} setIconColor={setIconColor} onAddIcon={addIconToCanvas} onAddImageFile={addImageToCanvas} />
      </>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F7F7F5]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-[14px] font-semibold text-gray-900 font-display">Graphic Builder</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={undo} disabled={!canUndo} className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors" title="Undo"><Undo2 className="h-3.5 w-3.5" /></button>
            <button onClick={redo} disabled={!canRedo} className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors" title="Redo"><Redo2 className="h-3.5 w-3.5" /></button>
          </div>
          <button onClick={resetCanvas} className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: "var(--brand-primary)" }}>
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Exporting…" : "Export & attach"}
          </button>
        </div>
      </div>

      {/* Platform size selector */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0 overflow-x-auto">
        <Monitor className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mr-1" />
        {Object.values(PLATFORM_SIZES).map((s) => (
          <button key={s.key} onClick={() => changeSize(s.key)}
            className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap flex-shrink-0 transition-all", sizeKey === s.key ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100")}
            style={sizeKey === s.key ? { background: "var(--brand-primary)" } : {}} title={s.platforms}>
            {s.shortLabel}
          </button>
        ))}
        <span className="text-[10px] text-gray-400 ml-2 hidden sm:block flex-shrink-0">{currentSize.exportW}×{currentSize.exportH} export</span>
      </div>

      {/* Main body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — templates */}
        <div className="hidden lg:flex flex-col w-48 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-2.5">Templates</p>
            <div className="space-y-2">
              {TEMPLATE_META.map((tpl) => (
                <TemplateThumbnail key={tpl.key} tpl={tpl} selected={templateKey === tpl.key} onClick={() => changeTemplate(tpl.key)} />
              ))}
            </div>
          </div>
        </div>

        {/* Center — canvas */}
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden bg-[#E8E8E5] p-4 lg:p-8">
          <div className="relative shadow-2xl" style={{ width: currentSize.displayW, height: currentSize.displayH }}>
            <canvas ref={canvasElRef} />
          </div>
          {/* Action row */}
          <div className="flex gap-2 mt-4">
            <button onClick={addTextBlock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 transition-colors shadow-sm">
              <Type className="h-3.5 w-3.5" />
              Add text
            </button>
            <button onClick={() => imageFileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-600 bg-white border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm">
              <ImageIcon className="h-3.5 w-3.5" />
              Add image
            </button>
            <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) addImageToCanvas(e.target.files[0]); }} />
          </div>
        </div>

        {/* Right panel — controls */}
        <div className="hidden lg:flex flex-col w-60 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-4">
            {/* Context label */}
            <div className="flex items-center gap-2 mb-3">
              {isTextSelected ? <Type className="h-3.5 w-3.5 text-indigo-500" /> : isImageSelected ? <ImageIcon className="h-3.5 w-3.5 text-emerald-500" /> : isLogoSelected ? <ImageIcon className="h-3.5 w-3.5 text-amber-500" /> : <Palette className="h-3.5 w-3.5 text-gray-400" />}
              <p className="text-[11px] font-bold text-gray-500">
                {isTextSelected ? "Text Controls" : isImageSelected ? "Image Controls" : isLogoSelected ? "Logo Controls" : "Background & Assets"}
              </p>
            </div>
            <ControlsContent />
          </div>
        </div>
      </div>

      {/* Mobile bottom panel */}
      <div className="lg:hidden border-t border-gray-200 bg-white flex-shrink-0">
        <div className="flex border-b border-gray-100">
          {["templates", "controls"].map((p) => (
            <button key={p} onClick={() => setMobilePanel(p)}
              className={cn("flex-1 py-2.5 text-[12px] font-semibold capitalize transition-colors", mobilePanel === p ? "text-gray-900 border-b-2 border-indigo-500" : "text-gray-400")}>
              {p === "controls" && (isTextSelected || isImageSelected || isLogoSelected) ? "✏️ Controls" : p}
            </button>
          ))}
        </div>
        <div className="h-52 overflow-y-auto p-3">
          {mobilePanel === "templates" && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TEMPLATE_META.map((tpl) => (
                <div key={tpl.key} className="flex-shrink-0 w-28">
                  <TemplateThumbnail tpl={tpl} selected={templateKey === tpl.key} onClick={() => changeTemplate(tpl.key)} />
                </div>
              ))}
            </div>
          )}
          {mobilePanel === "controls" && <ControlsContent />}
        </div>
      </div>
    </div>
  );
}
