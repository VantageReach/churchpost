// Easter computation — Anonymous Gregorian algorithm
function getEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

// nth occurrence of a weekday in a month (weekday: 0=Sun…6=Sat, n: 1-based)
function nthWeekday(year, month, weekday, n) {
  const d = new Date(year, month, 1);
  let count = 0;
  while (true) {
    if (d.getDay() === weekday) {
      count++;
      if (count === n) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
  }
}

// Last occurrence of a weekday in a month
function lastWeekday(year, month, weekday) {
  const d = new Date(year, month + 1, 0);
  while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
  return d;
}

export const nationalCalendar = [
  // ─── Federal Holidays ─────────────────────────────────────────────

  {
    key: "new_years_day",
    label: "New Year's Day",
    emoji: "🎆",
    category: "holiday",
    getDate: (year) => new Date(year, 0, 1),
    suggestTopics: ["new beginnings", "hope for the new year", "fresh start", "resolutions"],
  },
  {
    key: "mlk_day",
    label: "Martin Luther King Jr. Day",
    emoji: "✊",
    category: "holiday",
    getDate: (year) => nthWeekday(year, 0, 1, 3),
    suggestTopics: ["justice", "equality", "community service", "dream and hope"],
  },
  {
    key: "presidents_day",
    label: "Presidents' Day",
    emoji: "🇺🇸",
    category: "holiday",
    getDate: (year) => nthWeekday(year, 1, 1, 3),
    suggestTopics: ["service", "leadership", "community"],
  },
  {
    key: "memorial_day",
    label: "Memorial Day",
    emoji: "🎖️",
    category: "holiday",
    getDate: (year) => lastWeekday(year, 4, 1),
    suggestTopics: ["honor veterans", "service and sacrifice", "community", "remembrance"],
  },
  {
    key: "juneteenth",
    label: "Juneteenth",
    emoji: "✊",
    category: "holiday",
    getDate: (year) => new Date(year, 5, 19),
    suggestTopics: ["freedom", "equality", "celebration", "community"],
  },
  {
    key: "independence_day",
    label: "Independence Day",
    emoji: "🇺🇸",
    category: "holiday",
    getDate: (year) => new Date(year, 6, 4),
    suggestTopics: ["freedom", "gratitude", "community celebration"],
  },
  {
    key: "labor_day",
    label: "Labor Day",
    emoji: "⚒️",
    category: "holiday",
    getDate: (year) => nthWeekday(year, 8, 1, 1),
    suggestTopics: ["work", "rest", "community", "service"],
  },
  {
    key: "columbus_day",
    label: "Columbus Day",
    emoji: "⚓",
    category: "holiday",
    getDate: (year) => nthWeekday(year, 9, 1, 2),
    suggestTopics: ["exploration", "community"],
  },
  {
    key: "veterans_day",
    label: "Veterans Day",
    emoji: "🎗️",
    category: "holiday",
    getDate: (year) => new Date(year, 10, 11),
    suggestTopics: ["honor veterans", "service", "gratitude", "military families"],
  },
  {
    key: "thanksgiving",
    label: "Thanksgiving",
    emoji: "🦃",
    category: "holiday",
    getDate: (year) => nthWeekday(year, 10, 4, 4),
    suggestTopics: ["gratitude", "family", "community feast", "giving thanks"],
  },
  {
    key: "christmas",
    label: "Christmas Day",
    emoji: "🎄",
    category: "holiday",
    getDate: (year) => new Date(year, 11, 25),
    suggestTopics: ["birth of Jesus", "hope", "family", "giving", "advent"],
  },

  // ─── Church-Relevant Awareness Days ───────────────────────────────

  {
    key: "national_day_of_prayer",
    label: "National Day of Prayer",
    emoji: "🙏",
    category: "awareness",
    getDate: (year) => nthWeekday(year, 4, 4, 1),
    suggestTopics: ["prayer", "community", "faith", "intercession"],
  },
  {
    key: "world_kindness_day",
    label: "World Kindness Day",
    emoji: "💛",
    category: "awareness",
    getDate: (year) => new Date(year, 10, 13),
    suggestTopics: ["kindness", "community acts", "love your neighbor", "encouragement"],
  },
  {
    key: "national_volunteer_week",
    label: "National Volunteer Week",
    emoji: "🤝",
    category: "awareness",
    getDate: (year) => nthWeekday(year, 3, 0, 3),
    suggestTopics: ["volunteering", "service", "community", "church outreach"],
  },
  {
    key: "giving_tuesday",
    label: "Giving Tuesday",
    emoji: "💝",
    category: "awareness",
    getDate: (year) => {
      // Tuesday after Thanksgiving (4th Thursday of November)
      const thanksgiving = nthWeekday(year, 10, 4, 4);
      const d = new Date(thanksgiving);
      d.setDate(d.getDate() + 5); // Thursday + 5 = Tuesday of next week
      return d;
    },
    suggestTopics: ["generosity", "giving", "impact", "community support"],
  },
  {
    key: "international_day_of_peace",
    label: "International Day of Peace",
    emoji: "☮️",
    category: "awareness",
    getDate: (year) => new Date(year, 8, 21),
    suggestTopics: ["peace", "unity", "reconciliation", "hope"],
  },

  // ─── Liturgical Calendar (dynamic) ────────────────────────────────

  {
    key: "ash_wednesday",
    label: "Ash Wednesday",
    emoji: "✝️",
    category: "liturgical",
    getDate: (year) => {
      const d = getEaster(year);
      d.setDate(d.getDate() - 46);
      return d;
    },
    suggestTopics: ["Lent", "repentance", "reflection", "self-examination", "fasting"],
  },
  {
    key: "palm_sunday",
    label: "Palm Sunday",
    emoji: "🌿",
    category: "liturgical",
    getDate: (year) => {
      const d = getEaster(year);
      d.setDate(d.getDate() - 7);
      return d;
    },
    suggestTopics: ["Holy Week", "triumphal entry", "hosanna", "Easter preparation"],
  },
  {
    key: "good_friday",
    label: "Good Friday",
    emoji: "✝️",
    category: "liturgical",
    getDate: (year) => {
      const d = getEaster(year);
      d.setDate(d.getDate() - 2);
      return d;
    },
    suggestTopics: ["sacrifice", "atonement", "love", "Holy Week"],
  },
  {
    key: "easter",
    label: "Easter Sunday",
    emoji: "🌅",
    category: "liturgical",
    getDate: (year) => getEaster(year),
    suggestTopics: ["resurrection", "hope", "new life", "celebration", "He is risen"],
  },
  {
    key: "pentecost",
    label: "Pentecost Sunday",
    emoji: "🔥",
    category: "liturgical",
    getDate: (year) => {
      const d = getEaster(year);
      d.setDate(d.getDate() + 49);
      return d;
    },
    suggestTopics: ["Holy Spirit", "empowerment", "church birthday", "mission"],
  },
  {
    key: "advent_1",
    label: "First Sunday of Advent",
    emoji: "🕯️",
    category: "liturgical",
    getDate: (year) => {
      // 4th Sunday before Christmas (Dec 25)
      const christmas = new Date(year, 11, 25);
      const dayOfWeek = christmas.getDay();
      // Find the Sunday on or before Dec 25, then go back 3 more Sundays
      const nearestSunday = new Date(christmas);
      nearestSunday.setDate(christmas.getDate() - dayOfWeek);
      nearestSunday.setDate(nearestSunday.getDate() - 21);
      return nearestSunday;
    },
    suggestTopics: ["hope", "waiting", "Advent season", "preparing for Christmas"],
  },

  // ─── Fun / Engagement Days ─────────────────────────────────────────

  {
    key: "national_coffee_day",
    label: "National Coffee Day",
    emoji: "☕",
    category: "fun",
    getDate: (year) => new Date(year, 8, 29),
    suggestTopics: ["coffee fellowship", "Sunday morning", "church lobby", "community"],
  },
  {
    key: "national_donut_day",
    label: "National Donut Day",
    emoji: "🍩",
    category: "fun",
    getDate: (year) => nthWeekday(year, 5, 5, 1),
    suggestTopics: ["fellowship", "Sunday donuts", "community", "hospitality"],
  },
  {
    key: "random_acts_of_kindness_day",
    label: "Random Acts of Kindness Day",
    emoji: "🤗",
    category: "fun",
    getDate: (year) => new Date(year, 1, 17),
    suggestTopics: ["kindness challenge", "serve your neighbor", "love in action"],
  },
  {
    key: "world_smile_day",
    label: "World Smile Day",
    emoji: "😊",
    category: "fun",
    getDate: (year) => nthWeekday(year, 9, 5, 1),
    suggestTopics: ["joy", "community", "smile", "positivity", "sharing kindness"],
  },
];

/**
 * Returns entries for the given year filtered by category toggles, sorted by date.
 * @param {number} year
 * @param {{ holidays?: boolean, awareness?: boolean, liturgical?: boolean, fun?: boolean }} filters
 */
export function getCalendarEntries(year, filters = {}) {
  const {
    holidays = true,
    awareness = true,
    liturgical = true,
    fun = true,
  } = filters;

  const enabled = new Set([
    ...(holidays ? ["holiday"] : []),
    ...(awareness ? ["awareness"] : []),
    ...(liturgical ? ["liturgical"] : []),
    ...(fun ? ["fun"] : []),
  ]);

  return nationalCalendar
    .filter((e) => enabled.has(e.category))
    .map((e) => ({ ...e, date: e.getDate(year) }))
    .sort((a, b) => a.date - b.date);
}

/**
 * Returns entries within the next N days from a reference date, across years.
 * @param {Date} from
 * @param {number} days
 * @param {object} filters
 */
export function getUpcomingEntries(from, days = 60, filters = {}) {
  const to = new Date(from);
  to.setDate(to.getDate() + days);

  const years = new Set([from.getFullYear(), to.getFullYear()]);
  const all = [];
  for (const year of years) {
    all.push(...getCalendarEntries(year, filters));
  }

  return all.filter((e) => e.date >= from && e.date <= to).sort((a, b) => a.date - b.date);
}

export default nationalCalendar;
