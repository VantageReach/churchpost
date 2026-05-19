export const PLATFORM_SIZES = {
  square: {
    key: "square",
    label: "Square 1:1",
    shortLabel: "1:1",
    displayW: 480,
    displayH: 480,
    exportW: 1080,
    exportH: 1080,
    platforms: "Facebook • Instagram",
  },
  portrait: {
    key: "portrait",
    label: "Portrait 4:5",
    shortLabel: "4:5",
    displayW: 432,
    displayH: 540,
    exportW: 1080,
    exportH: 1350,
    platforms: "Instagram portrait",
  },
  story: {
    key: "story",
    label: "Story 9:16",
    shortLabel: "Story",
    displayW: 270,
    displayH: 480,
    exportW: 1080,
    exportH: 1920,
    platforms: "Instagram • Facebook stories",
  },
  landscape: {
    key: "landscape",
    label: "Landscape 16:9",
    shortLabel: "16:9",
    displayW: 480,
    displayH: 270,
    exportW: 1280,
    exportH: 720,
    platforms: "YouTube thumbnail",
  },
  fbCover: {
    key: "fbCover",
    label: "FB Cover",
    shortLabel: "Cover",
    displayW: 480,
    displayH: 183,
    exportW: 820,
    exportH: 312,
    platforms: "Facebook cover photo",
  },
};

export const TEMPLATE_META = [
  {
    key: "scripture",
    label: "Scripture Quote",
    emoji: "✝️",
    desc: "Centered quote + reference",
    accentBg: "from-indigo-600 to-purple-700",
  },
  {
    key: "event",
    label: "Event Announcement",
    emoji: "📅",
    desc: "Title, date, location",
    accentBg: "from-emerald-600 to-teal-700",
  },
  {
    key: "sermon",
    label: "Sermon Series",
    emoji: "🎙️",
    desc: "Series name + sermon title",
    accentBg: "from-gray-800 to-gray-900",
  },
  {
    key: "announcement",
    label: "General Announcement",
    emoji: "📣",
    desc: "Large text + subheading",
    accentBg: "from-amber-500 to-orange-600",
  },
  {
    key: "thisSunday",
    label: "This Sunday",
    emoji: "☀️",
    desc: "Service info + series name",
    accentBg: "from-sky-500 to-blue-600",
  },
  {
    key: "blank",
    label: "Blank Canvas",
    emoji: "🎨",
    desc: "Start from scratch",
    accentBg: "from-gray-200 to-gray-300",
  },
];

export const FONT_OPTIONS = [
  "Sora",
  "DM Sans",
  "Playfair Display",
  "Montserrat",
  "Lato",
  "Merriweather",
];

export const GRADIENT_DIRECTIONS = [
  { key: "tb", label: "Top → Bottom", x1: 0, y1: 0, x2: 0, y2: 1 },
  { key: "lr", label: "Left → Right", x1: 0, y1: 0.5, x2: 1, y2: 0.5 },
  { key: "diag", label: "Diagonal", x1: 0, y1: 0, x2: 1, y2: 1 },
];
