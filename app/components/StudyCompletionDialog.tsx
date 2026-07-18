import { useState } from "react";
import { useMobileModalEnvironment } from "@/app/components/EventDialog";

const QUICK_MINUTES = [15, 30, 45, 60, 90, 120] as const;

export function parseStudyMinutes(value: string) {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes > 0 && minutes <= 24 * 60
    ? minutes
    : null;
}

export function selectQuickStudyMinutes(amount: number) {
  return String(Math.min(24 * 60, Math.max(1, Math.round(amount))));
}

export default function StudyCompletionDialog({
  title,
  errorMessage,
  onCancel,
  onConfirm,
}: {
  title: string;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
}) {
  useMobileModalEnvironment();
  const [minutesValue, setMinutesValue] = useState("");
  const minutes = parseStudyMinutes(minutesValue);

  return (
    <div
      className="mobile-modal-layer fixed inset-0 z-[180] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-completion-title"
    >
      <div className="mobile-modal-panel flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="mobile-modal-body p-5">
        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
          📚 勉強時間を記録
        </p>
        <h3
          id="study-completion-title"
          className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50"
        >
          何分勉強しましたか？
        </h3>
        <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
          {title}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {QUICK_MINUTES.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() =>
                setMinutesValue(selectQuickStudyMinutes(amount))
              }
              className="mobile-interactive min-h-12 rounded-xl bg-indigo-50 px-3 text-sm font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
            >
              {amount}分
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm font-bold text-slate-700 dark:text-slate-200">
          自由入力（分）
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={24 * 60}
            step={1}
            value={minutesValue}
            onChange={(event) => setMinutesValue(event.target.value)}
            placeholder="例：45"
            autoFocus
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3 text-base tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </label>

        {errorMessage && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="mobile-interactive min-h-12 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => {
              if (minutes !== null) onConfirm(minutes);
            }}
            disabled={minutes === null}
            className="mobile-interactive min-h-12 flex-1 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-40"
          >
            完了して記録
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
