import { useState, useEffect } from "react";
import { Check, RefreshCw } from "lucide-react";
import { useSettingsQuery, useUpdateSettings } from "../../hooks/useSettings.js";
import { cn } from "../../lib/utils.js";

const TIMEZONES = [
  { label: "Eastern (ET) — New York", value: "America/New_York" },
  { label: "Central (CT) — Chicago", value: "America/Chicago" },
  { label: "Mountain (MT) — Denver", value: "America/Denver" },
  { label: "Pacific (PT) — Los Angeles", value: "America/Los_Angeles" },
  { label: "Alaska (AKT)", value: "America/Anchorage" },
  { label: "Hawaii (HT)", value: "Pacific/Honolulu" },
  { label: "UTC", value: "UTC" },
];

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 cursor-pointer",
          checked ? "bg-indigo-500" : "bg-gray-200"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-800">{label}</p>
        {description && (
          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
    </label>
  );
}

export default function GeneralPanel() {
  const { data: saved, isLoading } = useSettingsQuery();
  const update = useUpdateSettings();

  const [form, setForm] = useState(null);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (saved && !form) {
      setForm({
        orgName: saved.orgName ?? "",
        timezone: saved.timezone ?? "America/Chicago",
        aiSystemPrompt: saved.aiSystemPrompt ?? "",
        proactiveSuggestions: saved.proactiveSuggestions ?? true,
        nationalCalendarHolidays: saved.nationalCalendarHolidays ?? true,
        nationalCalendarAwareness: saved.nationalCalendarAwareness ?? true,
        nationalCalendarLiturgical: saved.nationalCalendarLiturgical ?? true,
        nationalCalendarFun: saved.nationalCalendarFun ?? true,
      });
    }
  }, [saved, form]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    await update.mutateAsync(form);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2000);
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
        <h2 className="text-[15px] font-semibold text-gray-900 font-display">General & AI</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Organization details, timezone, and AI content preferences.
        </p>
      </div>

      {/* Org name */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-gray-600">Organization Name</label>
        <input
          type="text"
          value={form.orgName}
          onChange={(e) => setField("orgName", e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14px] text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
      </div>

      {/* Timezone */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-gray-600">Timezone</label>
        <select
          value={form.timezone}
          onChange={(e) => setField("timezone", e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14px] text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
        >
          {TIMEZONES.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-400">
          Used for scheduled post times and calendar display.
        </p>
      </div>

      {/* AI System Prompt */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-gray-600">AI System Prompt</label>
        <p className="text-[11px] text-gray-400">
          This tells the AI how to write content for your church. Be specific about your tone,
          values, and audience.
        </p>
        <textarea
          value={form.aiSystemPrompt}
          onChange={(e) => setField("aiSystemPrompt", e.target.value)}
          rows={5}
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-[13px] text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all leading-relaxed"
          placeholder="e.g. You are a social media assistant for a welcoming, community-focused church in East Texas…"
        />
      </div>

      {/* National Calendar */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          National Calendar Overlays
        </h3>
        <p className="text-[11px] text-gray-400">
          These show on your calendar as scheduling inspiration. Uncheck what isn't relevant.
        </p>
        <div className="space-y-4 pt-1">
          <Toggle
            checked={form.nationalCalendarHolidays}
            onChange={(v) => setField("nationalCalendarHolidays", v)}
            label="Federal Holidays"
            description="Christmas, Easter, Thanksgiving, Independence Day, etc."
          />
          <Toggle
            checked={form.nationalCalendarLiturgical}
            onChange={(v) => setField("nationalCalendarLiturgical", v)}
            label="Liturgical Calendar"
            description="Advent, Lent, Pentecost, and major church seasons."
          />
          <Toggle
            checked={form.nationalCalendarAwareness}
            onChange={(v) => setField("nationalCalendarAwareness", v)}
            label="Awareness Days"
            description="Mental health, mission, and community observances."
          />
          <Toggle
            checked={form.nationalCalendarFun}
            onChange={(v) => setField("nationalCalendarFun", v)}
            label="Fun Days"
            description="National Coffee Day, Random Acts of Kindness Day, etc."
          />
        </div>
      </div>

      {/* AI Proactive Suggestions */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          AI Behavior
        </h3>
        <Toggle
          checked={form.proactiveSuggestions}
          onChange={(v) => setField("proactiveSuggestions", v)}
          label="Proactive content suggestions"
          description="AI will surface post ideas based on upcoming calendar events and posting gaps."
        />
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
          ) : savedOk ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
          {savedOk ? "Saved!" : "Save Settings"}
        </button>
        {update.isError && (
          <span className="text-[12px] text-red-500">Failed to save. Try again.</span>
        )}
      </div>
    </div>
  );
}
