"use client";

import { useState } from "react";
import {
  canScheduleLifeLog,
  LIFE_LOG_FOCUS_AREA_OPTIONS,
  LIFE_LOG_FOCUS_FILTER_OPTIONS,
  formatLifeLogDate,
  formatLifeLogTime,
  getLifeLogDisplayGroups,
  getInboxReviewState,
  getLifeLogFocusAreaLabel,
  getLifeLogStatusLabel,
  type LifeLogFocusFilter,
} from "@/app/lib/lifeLogs";
import type {
  CalendarEvent,
  LifeLog,
  LifeLogFocusArea,
} from "@/app/types/calendar";

const QUICK_CLASSIFY_OPTIONS = LIFE_LOG_FOCUS_AREA_OPTIONS.filter(
  ({ value }) => value !== "unset",
) as Array<{ value: Exclude<LifeLogFocusArea, "unset">; label: string }>;

type MobileLifeLogProps = {
  hasCheckedLocalCache: boolean;
  hasLoadedState: boolean;
  logs: LifeLog[];
  events?: CalendarEvent[];
  scheduleError?: string;
  initialFilter?: LifeLogFocusFilter;
  onAdd: () => void;
  onClassify: (log: LifeLog, focusArea: LifeLogFocusArea) => void;
  onDelete: (log: LifeLog) => void;
  onEdit: (log: LifeLog) => void;
  onOpenEvent: (log: LifeLog) => void;
  onSchedule: (log: LifeLog) => void;
};

export default function MobileLifeLog({
  hasCheckedLocalCache,
  hasLoadedState,
  initialFilter = "all",
  logs,
  events = [],
  scheduleError = "",
  onAdd,
  onClassify,
  onDelete,
  onEdit,
  onOpenEvent,
  onSchedule,
}: MobileLifeLogProps) {
  const [activeFilter, setActiveFilter] =
    useState<LifeLogFocusFilter>(initialFilter);
  const [isReviewingInbox, setIsReviewingInbox] = useState(false);
  const [undoLog, setUndoLog] = useState<LifeLog | null>(null);
  const displayGroups = getLifeLogDisplayGroups(
    logs,
    activeFilter,
    events,
  );
  const inboxReview = getInboxReviewState(logs);
  const emptyMessage =
    activeFilter === "all"
      ? "まだログはありません"
      : "この分類のログはまだありません";

  function classifyFromReview(
    log: LifeLog,
    focusArea: Exclude<LifeLogFocusArea, "unset">,
  ) {
    setUndoLog(log);
    onClassify(log, focusArea);
  }

  function undoLastClassification() {
    if (!undoLog) return;
    onClassify(undoLog, undoLog.focusArea);
    setUndoLog(null);
  }

  if (isReviewingInbox) {
    const currentLog = inboxReview.currentLog;

    return (
      <section className="md:hidden">
        <header className="mb-4">
          <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
            INBOX REVIEW
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Inbox整理
          </h2>
        </header>

        {inboxReview.isComplete || currentLog === null ? (
          <div className="rounded-3xl border border-emerald-100 bg-white p-5 text-center shadow-sm">
            <p className="text-lg font-bold text-emerald-700">
              Inboxの整理が完了しました
            </p>
            <button
              type="button"
              onClick={() => {
                setIsReviewingInbox(false);
                setUndoLog(null);
              }}
              className="mt-4 min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
            >
              ログへ戻る
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold text-slate-400">
                残り未分類 {inboxReview.remainingCount}件
              </p>
              <time
                dateTime={currentLog.createdAt}
                className="text-xs font-bold tabular-nums text-slate-400"
              >
                {formatLifeLogDate(currentLog.createdAt)}
              </time>
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-base font-bold leading-relaxed text-slate-900">
              {currentLog.title || currentLog.body}
            </p>
            <div className="mt-5 grid gap-2">
              {QUICK_CLASSIFY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => classifyFromReview(currentLog, value)}
                  className="min-h-12 rounded-2xl bg-slate-50 px-4 text-left text-sm font-bold text-slate-700"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsReviewingInbox(false)}
                className="min-h-11 rounded-xl px-3 text-sm font-bold text-slate-500"
              >
                ログへ戻る
              </button>
              {undoLog && (
                <button
                  type="button"
                  onClick={undoLastClassification}
                  className="min-h-11 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700"
                >
                  元に戻す
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="md:hidden">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
            LIFE LOG
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            ライフログ
          </h2>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm"
        >
          ＋ 新しいログ
        </button>
      </header>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-700">
            未分類 {inboxReview.remainingCount}件
          </p>
          {inboxReview.remainingCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsReviewingInbox(true);
                setUndoLog(null);
              }}
              className="min-h-10 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white"
            >
              Inboxを整理する
            </button>
          )}
        </div>
      </div>

      <div
        aria-label="ライフログ分類フィルター"
        className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {LIFE_LOG_FOCUS_FILTER_OPTIONS.map(({ value, label }) => {
          const isActive = activeFilter === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveFilter(value)}
              className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-bold transition-colors ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {scheduleError && (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"
        >
          {scheduleError}
        </p>
      )}

      {hasCheckedLocalCache && !hasLoadedState ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          ログを読み込んでいます…
        </div>
      ) : displayGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-5">
          {displayGroups.map((group) => (
            <section key={group.key} aria-labelledby={`log-group-${group.key}`}>
              <h3
                id={`log-group-${group.key}`}
                className="mb-2 text-sm font-bold text-slate-600"
              >
                {group.label}
              </h3>
              <div className="relative ml-3 border-l-2 border-slate-200 pl-5">
                {group.logs.map((log) => (
                  <article
                    key={log.id}
                    className="relative pb-4 last:pb-0"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400 ring-1 ring-slate-200"
                    />
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <time
                          dateTime={log.createdAt}
                          className="text-xs font-bold tabular-nums text-slate-400"
                        >
                          {formatLifeLogDate(log.createdAt)}{" "}
                          {formatLifeLogTime(log.createdAt)}
                        </time>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                            {getLifeLogFocusAreaLabel(log.focusArea)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                            {getLifeLogStatusLabel(log.status)}
                          </span>
                          {log.status === "scheduled" && (
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                              📅 予定化済み
                            </span>
                          )}
                          {log.status === "done" && (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                              ✅ 完了
                            </span>
                          )}
                        </div>
                      </div>
                      {log.title && (
                        <p className="mt-2 break-words text-sm font-bold text-slate-900">
                          {log.title}
                        </p>
                      )}
                      {log.body && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
                          {log.body}
                        </p>
                      )}
                      {log.origin === "event" && (
                        <p className="mt-2 text-xs font-bold text-blue-600">
                          このログは予定から作成されました
                        </p>
                      )}
                      {log.focusArea === "unset" && (
                        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-bold text-slate-400">
                            分類する
                          </p>
                          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                            {QUICK_CLASSIFY_OPTIONS.map(({ value, label }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => onClassify(log, value)}
                                className="min-h-8 shrink-0 rounded-full bg-white px-2.5 text-[11px] font-bold text-slate-600 shadow-sm"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex justify-end gap-2">
                        {canScheduleLifeLog(log) && (
                          <button
                            type="button"
                            onClick={() => onSchedule(log)}
                            className="min-h-9 rounded-lg bg-amber-50 px-3 text-xs font-bold text-amber-700"
                          >
                            予定にする
                          </button>
                        )}
                        {log.eventId && log.status !== "inbox" && (
                          <button
                            type="button"
                            onClick={() => onOpenEvent(log)}
                            className="min-h-9 rounded-lg bg-blue-50 px-3 text-xs font-bold text-blue-700"
                          >
                            予定を開く
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEdit(log)}
                          className="min-h-9 rounded-lg px-3 text-xs font-bold text-slate-500"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(log)}
                          className="min-h-9 rounded-lg px-3 text-xs font-bold text-rose-600"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
