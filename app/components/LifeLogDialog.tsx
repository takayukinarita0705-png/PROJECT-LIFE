import { useState } from "react";
import { LIFE_LOG_FOCUS_AREA_OPTIONS } from "@/app/lib/lifeLogs";
import type {
  LifeLog,
  LifeLogFocusArea,
} from "@/app/types/calendar";

type LifeLogDialogProps = {
  log: LifeLog | null;
  initialTitle?: string;
  isCreatedFromEvent?: boolean;
  onCancel: () => void;
  onSave: (
    title: string,
    body: string,
    focusArea: LifeLogFocusArea,
  ) => string | null;
};

export default function LifeLogDialog({
  log,
  initialTitle = "",
  isCreatedFromEvent = false,
  onCancel,
  onSave,
}: LifeLogDialogProps) {
  const [title, setTitle] = useState(log?.title ?? initialTitle);
  const [body, setBody] = useState(log?.body ?? "");
  const [focusArea, setFocusArea] = useState<LifeLogFocusArea>(
    log?.focusArea ?? "unset",
  );
  const [error, setError] = useState("");

  const showsTitle = isCreatedFromEvent || log?.title !== undefined;
  const showsEventOrigin = isCreatedFromEvent || log?.origin === "event";

  function save() {
    const saveError = onSave(title, body, focusArea);
    if (saveError) setError(saveError);
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end bg-slate-950/35 p-3 backdrop-blur-sm md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="life-log-dialog-title"
    >
      <div className="mobile-sheet w-full rounded-3xl bg-white p-5 shadow-2xl md:max-w-md">
        <h2
          id="life-log-dialog-title"
          className="text-lg font-bold text-slate-900"
        >
          {log ? "ログを編集" : "新しいログ"}
        </h2>
        {showsEventOrigin && (
          <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
            このログは予定から作成されました
          </p>
        )}
        {showsTitle && (
          <label className="mt-4 block text-sm font-bold text-slate-600">
            タイトル
            <input
              autoFocus
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError("");
              }}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-500"
            />
          </label>
        )}
        {isCreatedFromEvent && (
          <p className="mt-4 text-sm font-bold text-slate-600">
            カテゴリ
            <span className="ml-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              未分類
            </span>
          </p>
        )}
        <label className="mt-4 block text-sm font-bold text-slate-600">
          本文
          <textarea
            autoFocus={!showsTitle}
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
        {log && (
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
        )}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="mobile-interactive min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 md:min-h-11"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={save}
            className="mobile-interactive min-h-12 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white md:min-h-11"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
