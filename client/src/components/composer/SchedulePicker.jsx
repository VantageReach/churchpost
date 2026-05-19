import { Calendar, Clock, X } from "lucide-react";
import { cn } from "../../lib/utils.js";

function toLocalDatetimeValue(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SchedulePicker({ scheduledAt, onChange }) {
  const hasDate = !!scheduledAt;

  function handleChange(e) {
    if (!e.target.value) {
      onChange(null);
      return;
    }
    onChange(new Date(e.target.value).toISOString());
  }

  function clear() {
    onChange(null);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <Calendar className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="datetime-local"
          value={toLocalDatetimeValue(scheduledAt)}
          onChange={handleChange}
          min={toLocalDatetimeValue(new Date())}
          className={cn(
            "w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-[13px] text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all",
            !hasDate && "text-gray-400"
          )}
        />
      </div>
      {hasDate && (
        <button
          type="button"
          onClick={clear}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Clear schedule (save as draft)"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {hasDate && (
        <span className="text-[12px] text-emerald-600 font-medium whitespace-nowrap flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Scheduled
        </span>
      )}
      {!hasDate && (
        <span className="text-[12px] text-gray-400 whitespace-nowrap">Saves as draft</span>
      )}
    </div>
  );
}
