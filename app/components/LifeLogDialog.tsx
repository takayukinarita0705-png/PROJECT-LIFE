import { useState } from "react";
import { LIFE_LOG_FOCUS_AREA_OPTIONS } from "@/app/lib/lifeLogs";
import { formatTime } from "@/app/lib/time";
import type {
  LifeLog,
  LifeLogFocusArea,
  ScheduleItem,
} from "@/app/types/calendar";

type LifeLogDialogProps = {
  log: LifeLog | null;
  schedule: ScheduleItem[];
  onCancel: () => void;
  onSave: (
    body: string,
    eventId: string | undefined,
    focusArea: LifeLogFocusArea,
  ) => boolean;
};

export default function LifeLogDialog({
  log,
  schedule,
  onCancel,
  onSave,
}: LifeLogDialogProps) {
  const [body, setBody] = useState(log?.body ?? "");
  const [eventId, setEventId] = useState(log?.eventId ?? "");
  const [focusArea, setFocusArea] = useState<LifeLogFocusArea>(
    log?.focusArea ?? "unset",
  );
  const [error, setError] = useState("");
  const hasSelectedEvent = schedule.some(
    ({ event }) => event.id === eventId,
  );

  function save() {
    if (!onSave(body, eventId || undefined, focusArea)) {
      setError("本文を入力してください。");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end bg-slate-950/35 p-3 backdrop-blur-sm md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="life-log-dialog-title"
    >
      <div className="w-full rounded-3xl bg-white p-5 shadow-2xl md:max-w-md">
        <h2
          id="life-log-dialog-title"
          className="text-lg font-bold text-slate-900"
        >
          {log ? "ログを編集" : "新しいログ"}
        </h2>
        <label className="mt-4 block text-sm font-bold text-slate-600">
          本文
          <textarea
            autoFocus
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setError("");
            }}
            rows={5}
            className="mt-2 w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-500"
            placeholder="思いついたことや出来事を記録"
          />
        </label>
        <label className="mt-4 block text-sm font-bold text-slate-600">
          分類
          <select
            value={focusArea}
            onChange={(event) =>
              setFocusArea(event.target.value as LifeLogFocusArea)
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-500"
          >
            {LIFE_LOG_FOCUS_AREA_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-bold text-slate-600">
          予定に紐付ける（任意）
          <select
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-500"
          >
            <option value="">予定を選択しない</option>
            {eventId && !hasSelectedEvent && (
              <option value={eventId}>現在紐付いている予定</option>
            )}
            {schedule.map(({ event, category }) => (
              <option key={event.id} value={event.id}>
                {formatTime(event.start)} {category.icon}{" "}
                {event.title?.trim() || category.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={save}
            className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
