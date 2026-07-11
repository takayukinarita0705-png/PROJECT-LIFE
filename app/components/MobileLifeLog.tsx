"use client";

import { useState } from "react";
import LifeLogEventLink from "./LifeLogEventLink";
import {
  LIFE_LOG_FOCUS_AREA_OPTIONS,
  LIFE_LOG_FOCUS_FILTER_OPTIONS,
  formatLifeLogTime,
  getLifeLogFocusAreaLabel,
  getLifeLogStatusLabel,
  getLifeLogTimelineGroups,
  getLifeLogsByFocusFilter,
  type LifeLogFocusFilter,
} from "@/app/lib/lifeLogs";
import type {
  CalendarEvent,
  Category,
  LifeLog,
  LifeLogFocusArea,
} from "@/app/types/calendar";

const QUICK_CLASSIFY_OPTIONS = LIFE_LOG_FOCUS_AREA_OPTIONS.filter(
  ({ value }) => value !== "unset",
);

type MobileLifeLogProps = {
  categories: Category[];
  events: CalendarEvent[];
  hasCheckedLocalCache: boolean;
  hasLoadedState: boolean;
  logs: LifeLog[];
  onAdd: () => void;
  onClassify: (log: LifeLog, focusArea: LifeLogFocusArea) => void;
  onDelete: (log: LifeLog) => void;
  onEdit: (log: LifeLog) => void;
  onOpenEvent: (log: LifeLog) => void;
  onSchedule: (log: LifeLog) => void;
};

export default function MobileLifeLog({
  categories,
  events,
  hasCheckedLocalCache,
  hasLoadedState,
  logs,
  onAdd,
  onClassify,
  onDelete,
  onEdit,
  onOpenEvent,
  onSchedule,
}: MobileLifeLogProps) {
  const [activeFilter, setActiveFilter] =
    useState<LifeLogFocusFilter>("all");
  const filteredLogs = getLifeLogsByFocusFilter(logs, activeFilter);
  const timelineGroups = getLifeLogTimelineGroups(filteredLogs);
  const emptyMessage =
    activeFilter === "all"
      ? "まだログはありません"
      : "この分類のログはまだありません";

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

      {hasCheckedLocalCache && !hasLoadedState ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          ログを読み込んでいます…
        </div>
      ) : timelineGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-5">
          {timelineGroups.map((group) => (
            <section key={group.date} aria-labelledby={`log-date-${group.date}`}>
              <h3
                id={`log-date-${group.date}`}
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
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
                        {log.body}
                      </p>
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
                      <LifeLogEventLink
                        categories={categories}
                        events={events}
                        log={log}
                        onOpenEvent={onOpenEvent}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        {log.focusArea === "future" &&
                          log.status === "inbox" && (
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
