"use client";

import { useMemo, useState } from "react";
import { useMobileModalEnvironment } from "@/app/components/EventDialog";
import { formatActualMinutes } from "@/app/lib/records";
import type { StudyHistoryEntry } from "@/app/lib/studyTime";

type HistoryFilter = "all" | "takken" | "study";

const FILTERS: Array<{ value: HistoryFilter; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "takken", label: "宅建" },
  { value: "study", label: "勉強" },
];

function formatHistoryDate(entry: StudyHistoryEntry) {
  const date = entry.studyDate.replaceAll("-", "/");
  const createdAt = new Date(entry.createdAt);
  if (Number.isNaN(createdAt.getTime())) return date;
  const time = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(createdAt);
  return `${date} ${time}`;
}

function parseMinutes(value: string) {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 24 * 60
    ? minutes
    : null;
}

function StudyHistoryEditSheet({
  entry,
  onCancel,
  onDelete,
  onSave,
}: {
  entry: StudyHistoryEntry;
  onCancel: () => void;
  onDelete: (id: string) => boolean;
  onSave: (id: string, minutes: number) => boolean;
}) {
  useMobileModalEnvironment();
  const [minutesValue, setMinutesValue] = useState(String(entry.minutes));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState("");
  const minutes = parseMinutes(minutesValue);

  return (
    <div
      className="mobile-modal-layer fixed inset-0 z-[180] flex items-end bg-slate-950/50 p-3 backdrop-blur-sm md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-history-edit-title"
    >
      <div className="mobile-modal-panel flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="mobile-modal-body p-5">
          <p className="text-xs font-bold tracking-wide text-indigo-600 dark:text-indigo-300">
            勉強履歴を編集
          </p>
          <h3
            id="study-history-edit-title"
            className="mt-1 break-words text-lg font-bold text-slate-900 dark:text-slate-50"
          >
            {entry.taskTitle}
          </h3>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {formatHistoryDate(entry)}・{entry.categoryName}
          </p>

          <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200">
            勉強時間（分）
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={24 * 60}
              step={1}
              value={minutesValue}
              onChange={(event) => {
                setMinutesValue(event.target.value);
                setError("");
              }}
              className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3 text-base font-bold tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200"
            >
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="mobile-interactive min-h-12 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={minutes === null}
              onClick={() => {
                if (minutes === null || !onSave(entry.id, minutes)) {
                  setError("勉強時間を保存できませんでした。");
                  return;
                }
                onCancel();
              }}
              className="mobile-interactive min-h-12 flex-1 rounded-xl bg-indigo-600 text-sm font-bold text-white disabled:opacity-40"
            >
              保存
            </button>
          </div>

          {isConfirmingDelete ? (
            <div className="mt-3 rounded-2xl bg-rose-50 p-3 dark:bg-rose-950/60">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-200">
                この勉強履歴を削除しますか？
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="mobile-interactive min-h-11 flex-1 rounded-xl bg-white text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                >
                  戻る
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!onDelete(entry.id)) {
                      setError("勉強履歴を削除できませんでした。");
                      return;
                    }
                    onCancel();
                  }}
                  className="mobile-interactive min-h-11 flex-1 rounded-xl bg-rose-700 text-xs font-bold text-white"
                >
                  削除する
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="mobile-interactive mt-3 min-h-11 w-full rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300"
            >
              この履歴を削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MobileStudyHistory({
  entries,
  todayMinutes,
  weekMinutes,
  monthMinutes,
  totalMinutes,
  onBack,
  onDelete,
  onUpdateMinutes,
}: {
  entries: StudyHistoryEntry[];
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  totalMinutes: number;
  onBack: () => void;
  onDelete: (id: string) => boolean;
  onUpdateMinutes: (id: string, minutes: number) => boolean;
}) {
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [query, setQuery] = useState("");
  const [editingEntry, setEditingEntry] =
    useState<StudyHistoryEntry | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("ja");
  const filteredEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          (filter === "all" || entry.categoryGroup === filter) &&
          (normalizedQuery.length === 0 ||
            entry.taskTitle
              .toLocaleLowerCase("ja")
              .includes(normalizedQuery)),
      ),
    [entries, filter, normalizedQuery],
  );

  return (
    <section className="md:hidden">
      <header className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="今日の画面へ戻る"
          className="mobile-interactive grid min-h-11 min-w-11 place-items-center rounded-xl bg-white text-lg font-bold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"
        >
          ←
        </button>
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
            STUDY HISTORY
          </p>
          <h2 className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-slate-50">
            勉強履歴
          </h2>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {[
          ["今日", todayMinutes],
          ["今週", weekMinutes],
          ["今月", monthMinutes],
          ["累計", totalMinutes],
        ].map(([label, minutes]) => (
          <div
            key={label}
            className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-[11px] font-bold text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
              {formatActualMinutes(minutes as number)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
          タイトル検索
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例：宅建業法"
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto" aria-label="カテゴリフィルター">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`mobile-interactive min-h-11 shrink-0 rounded-xl px-4 text-xs font-bold ${
                filter === item.value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {filteredEntries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
            条件に一致する勉強履歴はありません
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setEditingEntry(entry)}
              className="mobile-interactive w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-bold text-slate-900 [overflow-wrap:anywhere] dark:text-slate-50">
                    📚 {entry.taskTitle}
                  </p>
                  <p className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                    {entry.categoryName}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
                  {entry.minutes}分
                </p>
              </div>
              <p className="mt-3 text-xs tabular-nums text-slate-400 dark:text-slate-500">
                {formatHistoryDate(entry)}
              </p>
            </button>
          ))
        )}
      </div>

      {editingEntry && (
        <StudyHistoryEditSheet
          entry={editingEntry}
          onCancel={() => setEditingEntry(null)}
          onDelete={onDelete}
          onSave={onUpdateMinutes}
        />
      )}
    </section>
  );
}
