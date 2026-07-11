"use client";

import { useState } from "react";
import LifeLogEventLink from "./LifeLogEventLink";
import {
  formatLifeLogDate,
  formatLifeLogTime,
  getFutureLifeLogs,
  getInboxLifeLogs,
  getLifeLogFocusAreaLabel,
  getLifeLogStatusLabel,
  getLifeLogTimelineGroups,
} from "@/app/lib/lifeLogs";
import type {
  CalendarEvent,
  Category,
  LifeLog,
} from "@/app/types/calendar";

type MobileLifeLogProps = {
  categories: Category[];
  events: CalendarEvent[];
  hasCheckedLocalCache: boolean;
  hasLoadedState: boolean;
  logs: LifeLog[];
  onAdd: () => void;
  onDelete: (log: LifeLog) => void;
  onEdit: (log: LifeLog) => void;
  onSchedule: (log: LifeLog) => void;
};

export default function MobileLifeLog({
  categories,
  events,
  hasCheckedLocalCache,
  hasLoadedState,
  logs,
  onAdd,
  onDelete,
  onEdit,
  onSchedule,
}: MobileLifeLogProps) {
  const [activeLogView, setActiveLogView] = useState<"inbox" | "future">(
    "inbox",
  );
  const timelineGroups = getLifeLogTimelineGroups(getInboxLifeLogs(logs));
  const futureLogs = getFutureLifeLogs(logs);
  const isFutureView = activeLogView === "future";

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

      <div className="mb-4 inline-flex rounded-xl bg-slate-200/70 p-1">
        <button
          type="button"
          onClick={() => setActiveLogView("inbox")}
          aria-pressed={activeLogView === "inbox"}
          className={`min-h-10 rounded-lg px-4 py-2 text-sm font-bold ${
            activeLogView === "inbox"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          }`}
        >
          📥 Inbox
        </button>
        <button
          type="button"
          onClick={() => setActiveLogView("future")}
          aria-pressed={isFutureView}
          className={`min-h-10 rounded-lg px-4 py-2 text-sm font-bold ${
            isFutureView
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          }`}
        >
          🟡 未来を作る
        </button>
      </div>

      {hasCheckedLocalCache && !hasLoadedState ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          ログを読み込んでいます…
        </div>
      ) : isFutureView ? (
        futureLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-8 text-center text-sm text-amber-700">
            未来を作るログはまだありません
          </div>
        ) : (
          <div className="grid gap-3">
            {futureLogs.map((log) => (
              <article
                key={log.id}
                className="rounded-2xl border border-amber-100 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <time
                    dateTime={log.createdAt}
                    className="text-xs font-bold tabular-nums text-slate-400"
                  >
                    {formatLifeLogDate(log.createdAt)}
                  </time>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
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
                <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium text-slate-800">
                  {log.body}
                </p>
                <div className="mt-3 flex justify-end">
                  {log.status === "inbox" ? (
                    <button
                      type="button"
                      onClick={() => onSchedule(log)}
                      className="min-h-10 rounded-lg bg-amber-50 px-3 text-xs font-bold text-amber-700"
                    >
                      予定にする
                    </button>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-400">
                      予定にする
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )
      ) : timelineGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          まだログはありません
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
                        <time
                          dateTime={log.createdAt}
                          className="text-xs font-bold tabular-nums text-slate-400"
                        >
                          {formatLifeLogTime(log.createdAt)}
                        </time>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
                          {log.body}
                        </p>
                        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                          {getLifeLogFocusAreaLabel(log.focusArea)}
                        </span>
                        {log.status === "scheduled" && (
                          <span className="ml-2 mt-2 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                            📅 予定化済み
                          </span>
                        )}
                        <LifeLogEventLink
                          categories={categories}
                          events={events}
                          log={log}
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
