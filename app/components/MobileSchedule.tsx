"use client";

import { useState } from "react";
import {
  DAYS,
  canQuickPostponeEvent,
  dateLabel,
  isCarryoverEligibleEvent,
} from "@/app/lib/calendar";
import ActualsList from "./ActualsList";
import MorningSummaryCard from "./MorningSummaryCard";
import { getLifeLogsForEvent } from "@/app/lib/lifeLogs";
import { MOBILE_SCROLL_TARGETS } from "@/app/lib/mobileNavigation";
import {
  addDaysToCalendarDate,
  formatCalendarDate,
  isEventOnDate,
  resolveEventDate,
} from "@/app/lib/date";
import {
  getActualsByCategory,
  getTodayProgress,
  isPerformanceTrackedCategory,
} from "@/app/lib/records";
import { formatTime } from "@/app/lib/time";
import type {
  CalendarEvent,
  LifeLog,
  ScheduleItem,
} from "@/app/types/calendar";

const MINUTES_PER_DAY = 24 * 60;

function normalizeDayMinutes(minutes: number) {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function ActualsSection({
  id,
  title,
  actuals,
}: {
  id?: string;
  title: string;
  actuals: ReturnType<typeof getActualsByCategory>;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="scroll-mb-28 scroll-mt-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
    >
      <p className="text-xs font-bold tracking-wide text-slate-500">
        {title}
      </p>
      <ActualsList actuals={actuals} />
    </section>
  );
}

export function isCurrentMobileEvent(
  event: CalendarEvent,
  currentDate: string | null,
  currentMinutes: number | null,
) {
  if (
    currentDate === null ||
    currentMinutes === null ||
    !isEventOnDate(event, currentDate)
  ) {
    return false;
  }

  const duration = event.end - event.start;
  if (duration >= MINUTES_PER_DAY) return true;
  if (duration === 0) return false;

  const start = normalizeDayMinutes(event.start);
  const end = normalizeDayMinutes(event.end);
  const now = normalizeDayMinutes(currentMinutes);

  if (start < end && duration > 0) {
    return start <= now && now < end;
  }

  return start <= now || now < end;
}

function MobileEventCard({
  isCurrent,
  item: { event, category },
  logs,
  onMoveToTomorrow,
  onOpenLifeLog,
  onRequestPostpone,
  onResetStatus,
  onToggleCompleted,
  onToggleSkipped,
}: {
  isCurrent: boolean;
  item: ScheduleItem;
  logs: LifeLog[];
  onMoveToTomorrow: (eventId: string) => void;
  onOpenLifeLog: (log: LifeLog) => void;
  onRequestPostpone: (event: CalendarEvent) => void;
  onResetStatus: (eventId: string) => void;
  onToggleCompleted: (eventId: string) => void;
  onToggleSkipped: (eventId: string) => void;
}) {
  const displayTitle = event.title?.trim() || category.name;
  const isCompleted = event.status === "completed";
  const isSkipped = event.status === "skipped";
  const isCheckable = isPerformanceTrackedCategory(category);
  const canMoveToTomorrow = isSkipped && isCarryoverEligibleEvent(event);
  const linkedLogs = getLifeLogsForEvent(
    logs,
    event.id,
    event.lifeLogId,
  );

  return (
    <article
      aria-current={isCurrent ? "time" : undefined}
      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border border-l-4 px-3 py-2 text-left ${
        isCompleted
          ? "border-emerald-200 bg-emerald-50"
          : isSkipped
            ? "border-dashed border-slate-300 bg-slate-100"
            : isCurrent
              ? "border-rose-400 bg-rose-50 shadow-md ring-2 ring-rose-200"
              : "border-slate-200 bg-white"
      }`}
      style={{ borderLeftColor: category.color }}
    >
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg text-white"
        style={{ background: category.color }}
      >
        {category.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3
            className={`truncate font-bold ${
              isCompleted
                ? "text-emerald-700 line-through"
                : isSkipped
                  ? "text-slate-400 line-through"
                  : "text-slate-900"
            }`}
          >
            {displayTitle}
          </h3>
          {isCurrent && (
            <span className="shrink-0 rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
              進行中
            </span>
          )}
          {isSkipped && (
            <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              スキップ
            </span>
          )}
        </div>
        <p
          className={`text-sm font-medium tabular-nums ${
            isSkipped ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {formatTime(event.start)}〜{formatTime(event.end)}
        </p>
        {linkedLogs.length > 0 && (
          <div className="mt-1 grid gap-1">
            {linkedLogs.map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => onOpenLifeLog(log)}
                className="whitespace-pre-wrap break-words rounded-lg bg-slate-100/80 px-2 py-1 text-left text-xs text-slate-600"
              >
                📝 {log.title || log.body || "本文なし"}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex w-28 shrink-0 flex-wrap justify-end gap-1">
        {canQuickPostponeEvent(event) && (
          <button
            type="button"
            onClick={() => onRequestPostpone(event)}
            className="min-h-10 rounded-xl bg-blue-50 px-2 text-xs font-bold text-blue-700"
          >
            延期
          </button>
        )}
        {!isCheckable ? null : isCompleted || isSkipped ? (
          <>
            {canMoveToTomorrow && (
              <button
                type="button"
                onClick={() => onMoveToTomorrow(event.id)}
                aria-label={`${displayTitle}を明日に移動`}
                className="min-h-11 rounded-xl bg-amber-100 px-3 text-xs font-bold text-amber-700"
              >
                明日に移動
              </button>
            )}
            <button
              type="button"
              onClick={() => onResetStatus(event.id)}
              aria-label={`${displayTitle}を未完了に戻す`}
              className={`min-h-11 rounded-xl px-3 text-xs font-bold ${
                isCompleted
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-700 text-white"
              }`}
            >
              戻す
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onToggleSkipped(event.id)}
              className="min-h-11 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-600"
            >
              スキップ
            </button>
            <button
              type="button"
              onClick={() => onToggleCompleted(event.id)}
              aria-label={`${displayTitle}を完了`}
              className="min-h-11 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white"
            >
              完了
            </button>
          </>
        )}
      </div>
    </article>
  );
}

type MobileScheduleProps = {
  completionStreak: number;
  currentTime: Date | null;
  currentDay: number | null;
  hasCheckedLocalCache: boolean;
  hasLoadedEvents: boolean;
  logs: LifeLog[];
  onOpenActualsSummary: () => void;
  onOpenFutureLogsSummary: () => void;
  onMoveToTomorrow: (eventId: string) => void;
  onOpenLifeLog: (log: LifeLog) => void;
  onPostpone: (eventId: string, targetDate: string) => void;
  onOpenScheduleSummary: () => void;
  onOpenStreakSummary: () => void;
  onResetStatus: (eventId: string) => void;
  onToggleCompleted: (eventId: string) => void;
  onToggleSkipped: (eventId: string) => void;
  todaySchedule: ScheduleItem[];
};

export default function MobileSchedule({
  completionStreak,
  currentTime,
  currentDay,
  hasCheckedLocalCache,
  hasLoadedEvents,
  logs,
  onOpenActualsSummary,
  onOpenFutureLogsSummary,
  onMoveToTomorrow,
  onOpenLifeLog,
  onPostpone,
  onOpenScheduleSummary,
  onOpenStreakSummary,
  onResetStatus,
  onToggleCompleted,
  onToggleSkipped,
  todaySchedule,
}: MobileScheduleProps) {
  const [postponingEvent, setPostponingEvent] =
    useState<CalendarEvent | null>(null);
  const [customPostponeDate, setCustomPostponeDate] = useState("");
  const currentMinutes =
    currentTime === null
      ? null
      : currentTime.getHours() * 60 +
        currentTime.getMinutes() +
        currentTime.getSeconds() / 60;
  const currentDate =
    currentTime === null ? null : formatCalendarDate(currentTime);
  const todayProgress = getTodayProgress(
    todaySchedule
      .filter(({ category }) => isPerformanceTrackedCategory(category))
      .map(({ event }) => event),
  );
  const todayActuals = getActualsByCategory(todaySchedule);
  const currentScheduleItem =
    todaySchedule.find(
      ({ event }) =>
        event.status !== "completed" &&
        event.status !== "skipped" &&
        isCurrentMobileEvent(event, currentDate, currentMinutes),
    ) ?? null;
  const remainingSchedule = currentScheduleItem
    ? todaySchedule.filter(
        ({ event }) => event.id !== currentScheduleItem.event.id,
      )
    : todaySchedule;

  function openPostponeOptions(event: CalendarEvent) {
    setPostponingEvent(event);
    setCustomPostponeDate(
      addDaysToCalendarDate(resolveEventDate(event), 1),
    );
  }

  function postponeTo(targetDate: string) {
    if (!postponingEvent) return;
    onPostpone(postponingEvent.id, targetDate);
    setPostponingEvent(null);
  }

  return (
    <section className="md:hidden">
      <header className="mb-3">
        <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
          TODAY
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">
            今日のスケジュール
          </h2>
          {currentTime && currentDay !== null && (
            <p className="shrink-0 text-sm font-bold text-slate-500">
              {dateLabel(currentTime)}（{DAYS[currentDay]}）
            </p>
          )}
        </div>
      </header>

      {hasCheckedLocalCache && !hasLoadedEvents ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          予定を読み込んでいます…
        </div>
      ) : currentDay === null ? null : (
        <div className="grid gap-3">
          <MorningSummaryCard
            completionStreak={completionStreak}
            currentDay={currentDay}
            currentTime={currentTime}
            logs={logs}
            onOpenActuals={onOpenActualsSummary}
            onOpenFutureLogs={onOpenFutureLogsSummary}
            onOpenSchedule={onOpenScheduleSummary}
            onOpenStreak={onOpenStreakSummary}
            todaySchedule={todaySchedule}
          />

          <section
            aria-label="今日の達成状況"
            className="rounded-3xl border border-emerald-100 bg-emerald-50/70 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wide text-emerald-700">
                  今日の達成状況
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-700">
                  {todayProgress.completed} / {todayProgress.total} 件完了
                </p>
              </div>
              <p className="text-xl font-bold tabular-nums text-emerald-700">
                {todayProgress.percentage}%
              </p>
            </div>
            <div
              role="progressbar"
              aria-label="今日の予定の達成率"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={todayProgress.percentage}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100"
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${todayProgress.percentage}%` }}
              />
            </div>
          </section>

          {currentScheduleItem && (
            <section aria-label="現在進行中の予定">
              <p className="mb-2 text-xs font-bold text-rose-600">
                現在進行中の予定
              </p>
              <MobileEventCard
                isCurrent
                item={currentScheduleItem}
                logs={logs}
                onMoveToTomorrow={onMoveToTomorrow}
                onOpenLifeLog={onOpenLifeLog}
                onRequestPostpone={openPostponeOptions}
                onResetStatus={onResetStatus}
                onToggleCompleted={onToggleCompleted}
                onToggleSkipped={onToggleSkipped}
              />
            </section>
          )}

          <section
            id={MOBILE_SCROLL_TARGETS.todaySchedule}
            aria-label="今日の予定一覧"
            className="scroll-mb-28 scroll-mt-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-500">
              今日の予定一覧
            </p>
            {remainingSchedule.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                {todaySchedule.length === 0
                  ? "今日の予定はありません"
                  : "他の予定はありません"}
              </p>
            ) : (
              <div className="mt-2 grid gap-2">
                {remainingSchedule.map((item) => (
                  <MobileEventCard
                    key={item.event.id}
                    isCurrent={false}
                    item={item}
                    logs={logs}
                    onMoveToTomorrow={onMoveToTomorrow}
                    onOpenLifeLog={onOpenLifeLog}
                    onRequestPostpone={openPostponeOptions}
                    onResetStatus={onResetStatus}
                    onToggleCompleted={onToggleCompleted}
                    onToggleSkipped={onToggleSkipped}
                  />
                ))}
              </div>
            )}
          </section>

          <ActualsSection
            id={MOBILE_SCROLL_TARGETS.todayActuals}
            title="今日の実績"
            actuals={todayActuals}
          />
        </div>
      )}

      {postponingEvent && (
        <div
          className="fixed inset-0 z-[145] flex items-end bg-slate-950/45 p-3 backdrop-blur-sm md:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="postpone-dialog-title"
        >
          <div className="w-full rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-blue-600">クイック延期</p>
                <h3
                  id="postpone-dialog-title"
                  className="mt-1 text-lg font-bold text-slate-900"
                >
                  {postponingEvent.title?.trim() || "予定"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPostponingEvent(null)}
                aria-label="延期を閉じる"
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "明日", days: 1 },
                { label: "3日後", days: 3 },
                { label: "来週", days: 7 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() =>
                    postponeTo(
                      addDaysToCalendarDate(
                        resolveEventDate(postponingEvent),
                        days,
                      ),
                    )
                  }
                  className="min-h-12 rounded-xl bg-blue-50 px-3 text-sm font-bold text-blue-700"
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-sm font-bold text-slate-600">
              日付を選択
              <input
                type="date"
                min={addDaysToCalendarDate(
                  resolveEventDate(postponingEvent),
                  1,
                )}
                value={customPostponeDate}
                onChange={(event) =>
                  setCustomPostponeDate(event.target.value)
                }
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
              />
            </label>
            <button
              type="button"
              disabled={!customPostponeDate}
              onClick={() => postponeTo(customPostponeDate)}
              className="mt-3 min-h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-40"
            >
              この日へ延期
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
