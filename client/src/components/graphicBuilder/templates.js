import { fabric } from "fabric";

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001/api" : "/api");

// Route R2 URLs through our server proxy so Fabric.js canvas doesn't taint on missing CORS headers
function proxyLogoUrl(url) {
  if (!url) return url;
  if (/\.r2\.dev|\.r2\.cloudflarestorage\.com/.test(url)) {
    return `${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function rgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function addLogoPlaceholder(canvas, w, h, font) {
  const logo = new fabric.Textbox("LOGO", {
    left: w / 2 - 30,
    top: h - 44,
    width: 60,
    fontSize: 11,
    fontFamily: font,
    fontWeight: "bold",
    fill: "rgba(255,255,255,0.45)",
    textAlign: "center",
    selectable: true,
    id: "logo",
    customType: "logo",
    lockRotation: true,
  });
  canvas.add(logo);
  return logo;
}

function makeLine(canvas, x1, y1, x2, y2, color = "rgba(255,255,255,0.35)") {
  const line = new fabric.Line([x1, y1, x2, y2], {
    stroke: color,
    strokeWidth: 1,
    selectable: false,
    evented: false,
    id: "deco-line",
    customType: "decoration",
  });
  canvas.add(line);
  return line;
}

function makeAccentRect(canvas, x, y, rw, rh, color) {
  const rect = new fabric.Rect({
    left: x,
    top: y,
    width: rw,
    height: rh,
    fill: color,
    selectable: false,
    evented: false,
    id: "accent-bar",
    customType: "decoration",
  });
  canvas.add(rect);
  return rect;
}

export function applyTemplate(key, { primaryColor, secondaryColor, fontFamily, logoUrl }, canvas, size) {
  const { displayW: w, displayH: h } = size;

  const safeFont = fontFamily || "Sora";
  const primary = primaryColor || "#6366f1";
  const secondary = secondaryColor || "#818cf8";

  canvas.clear();
  canvas.setWidth(w);
  canvas.setHeight(h);

  const factories = {
    scripture: () => applyScripture(canvas, w, h, primary, secondary, safeFont, logoUrl),
    event:     () => applyEvent(canvas, w, h, primary, secondary, safeFont, logoUrl),
    sermon:    () => applySermon(canvas, w, h, primary, secondary, safeFont, logoUrl),
    announcement: () => applyAnnouncement(canvas, w, h, primary, secondary, safeFont, logoUrl),
    thisSunday: () => applyThisSunday(canvas, w, h, primary, secondary, safeFont, logoUrl),
    blank:     () => applyBlank(canvas, w, h, primary, secondary, safeFont),
  };

  (factories[key] || factories.blank)();
  canvas.renderAll();
}

function applyScripture(canvas, w, h, primary, secondary, font, logoUrl) {
  canvas.setBackgroundColor(primary, canvas.renderAll.bind(canvas));

  const quote = new fabric.Textbox('"Enter your scripture quote here and let the Word speak."', {
    left: w * 0.1,
    top: h * 0.22,
    width: w * 0.8,
    fontSize: Math.round(h * 0.058),
    fontFamily: font,
    fontStyle: "italic",
    fill: "#ffffff",
    textAlign: "center",
    lineHeight: 1.4,
    id: "primary-text",
    customType: "text",
    name: "Quote",
  });
  canvas.add(quote);

  makeLine(canvas, w * 0.35, h * 0.58, w * 0.65, h * 0.58);

  const ref = new fabric.Textbox("— John 3:16", {
    left: w * 0.2,
    top: h * 0.61,
    width: w * 0.6,
    fontSize: Math.round(h * 0.034),
    fontFamily: font,
    fill: rgba("#ffffff", 0.75),
    textAlign: "center",
    id: "reference-text",
    customType: "text",
    name: "Reference",
  });
  canvas.add(ref);

  if (logoUrl) {
    loadLogo(canvas, logoUrl, w / 2 - 25, h - 48, 50);
  } else {
    addLogoPlaceholder(canvas, w, h, font);
  }
}

function applyEvent(canvas, w, h, primary, secondary, font, logoUrl) {
  const gradient = new fabric.Gradient({
    type: "linear",
    coords: { x1: 0, y1: 0, x2: w, y2: h },
    colorStops: [
      { offset: 0, color: primary },
      { offset: 1, color: secondary },
    ],
  });
  canvas.setBackgroundColor(gradient, canvas.renderAll.bind(canvas));

  const title = new fabric.Textbox("EVENT TITLE", {
    left: w * 0.08,
    top: h * 0.15,
    width: w * 0.84,
    fontSize: Math.round(h * 0.09),
    fontFamily: font,
    fontWeight: "bold",
    fill: "#ffffff",
    textAlign: "center",
    charSpacing: 80,
    lineHeight: 1.2,
    id: "primary-text",
    customType: "text",
    name: "Event Title",
  });
  canvas.add(title);

  const date = new fabric.Textbox("Sunday, May 25th · 10:00 AM", {
    left: w * 0.1,
    top: h * 0.5,
    width: w * 0.8,
    fontSize: Math.round(h * 0.042),
    fontFamily: font,
    fill: rgba("#ffffff", 0.9),
    textAlign: "center",
    id: "date-text",
    customType: "text",
    name: "Date & Time",
  });
  canvas.add(date);

  const loc = new fabric.Textbox("123 Main Street · City Church", {
    left: w * 0.1,
    top: h * 0.62,
    width: w * 0.8,
    fontSize: Math.round(h * 0.033),
    fontFamily: font,
    fill: rgba("#ffffff", 0.65),
    textAlign: "center",
    id: "location-text",
    customType: "text",
    name: "Location",
  });
  canvas.add(loc);

  if (logoUrl) {
    loadLogo(canvas, logoUrl, w - 60, h - 55, 45);
  } else {
    addLogoPlaceholder(canvas, w, h, font);
  }
}

function applySermon(canvas, w, h, primary, secondary, font, logoUrl) {
  canvas.setBackgroundColor("#111827", canvas.renderAll.bind(canvas));

  makeAccentRect(canvas, 0, 0, w, h * 0.006, primary);

  const series = new fabric.Textbox("SERMON SERIES NAME", {
    left: w * 0.1,
    top: h * 0.12,
    width: w * 0.8,
    fontSize: Math.round(h * 0.032),
    fontFamily: font,
    fontWeight: "bold",
    fill: rgba(primary, 0.85),
    textAlign: "center",
    charSpacing: 120,
    id: "series-text",
    customType: "text",
    name: "Series Name",
  });
  canvas.add(series);

  const week = new fabric.Textbox("Week 3", {
    left: w * 0.1,
    top: h * 0.24,
    width: w * 0.8,
    fontSize: Math.round(h * 0.025),
    fontFamily: font,
    fill: rgba("#ffffff", 0.4),
    textAlign: "center",
    id: "week-text",
    customType: "text",
    name: "Week Number",
  });
  canvas.add(week);

  const sermonTitle = new fabric.Textbox("The Sermon Title Goes Here", {
    left: w * 0.08,
    top: h * 0.36,
    width: w * 0.84,
    fontSize: Math.round(h * 0.078),
    fontFamily: font,
    fontWeight: "bold",
    fill: "#ffffff",
    textAlign: "center",
    lineHeight: 1.15,
    id: "primary-text",
    customType: "text",
    name: "Sermon Title",
  });
  canvas.add(sermonTitle);

  const scripture = new fabric.Textbox("John 15:1-17", {
    left: w * 0.1,
    top: h * 0.79,
    width: w * 0.8,
    fontSize: Math.round(h * 0.03),
    fontFamily: font,
    fill: rgba("#ffffff", 0.45),
    textAlign: "center",
    id: "scripture-text",
    customType: "text",
    name: "Scripture",
  });
  canvas.add(scripture);

  if (logoUrl) {
    loadLogo(canvas, logoUrl, 18, 18, 40);
  } else {
    const logoText = new fabric.Textbox("LOGO", {
      left: 18,
      top: 18,
      width: 60,
      fontSize: 11,
      fontFamily: font,
      fontWeight: "bold",
      fill: rgba(primary, 0.55),
      id: "logo",
      customType: "logo",
    });
    canvas.add(logoText);
  }
}

function applyAnnouncement(canvas, w, h, primary, secondary, font, logoUrl) {
  canvas.setBackgroundColor(primary, canvas.renderAll.bind(canvas));

  const heading = new fabric.Textbox("Important Announcement", {
    left: w * 0.08,
    top: h * 0.28,
    width: w * 0.84,
    fontSize: Math.round(h * 0.09),
    fontFamily: font,
    fontWeight: "bold",
    fill: "#ffffff",
    textAlign: "center",
    lineHeight: 1.15,
    id: "primary-text",
    customType: "text",
    name: "Heading",
  });
  canvas.add(heading);

  const sub = new fabric.Textbox("Add more details or a call to action here.", {
    left: w * 0.1,
    top: h * 0.63,
    width: w * 0.8,
    fontSize: Math.round(h * 0.038),
    fontFamily: font,
    fill: rgba("#ffffff", 0.75),
    textAlign: "center",
    lineHeight: 1.4,
    id: "sub-text",
    customType: "text",
    name: "Subheading",
  });
  canvas.add(sub);

  if (logoUrl) {
    loadLogo(canvas, logoUrl, w / 2 - 25, h - 48, 50);
  } else {
    addLogoPlaceholder(canvas, w, h, font);
  }
}

function applyThisSunday(canvas, w, h, primary, secondary, font, logoUrl) {
  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));

  makeAccentRect(canvas, 0, 0, Math.round(w * 0.015), h, primary);

  const label = new fabric.Textbox("THIS SUNDAY", {
    left: w * 0.06,
    top: h * 0.14,
    width: w * 0.85,
    fontSize: Math.round(h * 0.032),
    fontFamily: font,
    fontWeight: "bold",
    fill: primary,
    charSpacing: 120,
    id: "label-text",
    customType: "text",
    name: "Label",
  });
  canvas.add(label);

  const title = new fabric.Textbox("Sermon or Series Title", {
    left: w * 0.06,
    top: h * 0.28,
    width: w * 0.88,
    fontSize: Math.round(h * 0.088),
    fontFamily: font,
    fontWeight: "bold",
    fill: "#111827",
    lineHeight: 1.1,
    id: "primary-text",
    customType: "text",
    name: "Title",
  });
  canvas.add(title);

  const time = new fabric.Textbox("10:00 AM • 6:00 PM  |  123 Main Street", {
    left: w * 0.06,
    top: h * 0.73,
    width: w * 0.85,
    fontSize: Math.round(h * 0.033),
    fontFamily: font,
    fill: "#6b7280",
    id: "time-text",
    customType: "text",
    name: "Time & Location",
  });
  canvas.add(time);

  if (logoUrl) {
    loadLogo(canvas, logoUrl, w - 60, 18, 45);
  } else {
    const logoText = new fabric.Textbox("LOGO", {
      left: w - 60,
      top: 18,
      width: 50,
      fontSize: 11,
      fontFamily: font,
      fontWeight: "bold",
      fill: rgba(primary, 0.6),
      textAlign: "right",
      id: "logo",
      customType: "logo",
    });
    canvas.add(logoText);
  }
}

function applyBlank(canvas, w, h, primary) {
  canvas.setBackgroundColor("#f9fafb", canvas.renderAll.bind(canvas));
  canvas.renderAll();
}

function loadLogo(canvas, url, x, y, size) {
  const src = proxyLogoUrl(url);
  fabric.Image.fromURL(
    src,
    (img) => {
      if (!img) return;
      img.scaleToWidth(size);
      img.set({ left: x, top: y, id: "logo", customType: "logo" });
      canvas.add(img);
      canvas.renderAll();
    },
    { crossOrigin: "anonymous" }
  );
}
