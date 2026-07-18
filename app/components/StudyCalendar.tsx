"use client";

import { memo, useMemo, useState } from "react";
import { DAYS } from "@/app/lib/calendar";
import {
  getCalendarDayIndex,
  parseCalendarDate,
} from "@/app/lib/date";
import { getStudyHeatmapLevel } from "@/app/lib/studyTime";
import type { StudyCalendarDay } from "@/app/lib/studyTime";

const LEVEL_STYLES = [
  "bg-slate-100 dark:bg-slate-800",
  "bg-indigo-100 dark:bg-indigo-950",
  "bg-indigo-200 dark:bg-indigo-900",
  "bg-indigo-400 dark:bg-indigo-700",
  "bg-indigo-600 dark:bg-indigo-400",
] as const;

function formatDayLabel(value: string) {
  const date = parseCalendarDate(value);
  if (!date) return value;
  return `${date.getMonth() + 1}月${date.getDate()}日（${
    DAYS[getCalendarDayIndex(date)]
  }）`;
}

function StudyCalendar({
  days,
  today,
  streakDays,
}: {
  days: StudyCalendarDay[];
  today: string;
  streakDays: number;
}) {
  const [selectedDate, setSelectedDate] = useState(today);
  const firstDate = days[0]?.date;
  const leadingEmptyCells = useMemo(() => {
    if (!firstDate) return 0;
    const date = parseCalendarDate(firstDate);
    return date ? getCalendarDayIndex(date) : 0;
  }, [firstDate]);
  const cells = useMemo(
    () => [
      ...Array.from({ length: leadingEmptyCells }, () => null),
      ...days,
    ],
    [days, leadingEmptyCells],
  );
  const columnCount = Math.max(1, Math.ceil(cells.length / DAYS.length));
  const selectedDay =
    days.find((day) => day.date === selectedDate) ?? days.at(-1);

  if (!selectedDay) return null;

  return (
    <section
      aria-label="直近90日の勉強カレンダー"
      className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-indigo-600 dark:text-indigo-300">
            勉強カレンダー
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
            直近90日の積み上げ
          </p>
        </div>
        <p className="shrink-0 text-xs font-bold tabular-nums text-orange-700 dark:text-orange-300">
          🔥 {streakDays}日継続
        </p>
      </div>

      <div className="mt-4 grid grid-cols-[1rem_minmax(0,1fr)] gap-2">
        <div className="grid grid-rows-7 gap-1" aria-hidden="true">
          {DAYS.map((day) => (
            <span
              key={day}
              className="grid place-items-center text-[9px] font-bold text-slate-400 dark:text-slate-500"
            >
              {day}
            </span>
          ))}
        </div>
        <div
          className="grid grid-flow-col grid-rows-7 gap-1"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((day, index) =>
            day === null ? (
              <span key={`empty-${index}`} aria-hidden="true" />
            ) : (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                aria-label={`${formatDayLabel(day.date)} ${day.minutes}分`}
                aria-pressed={selectedDay.date === day.date}
                title={`${day.date}: ${day.minutes}分`}
                className={`mobile-interactive aspect-square min-w-0 rounded-[4px] border transition-colors duration-200 motion-reduce:transition-none ${
                  LEVEL_STYLES[getStudyHeatmapLevel(day.minutes)]
                } ${
                  day.date === today
                    ? "border-indigo-700 ring-1 ring-indigo-700 ring-offset-1 dark:border-indigo-200 dark:ring-indigo-200 dark:ring-offset-slate-900"
                    : selectedDay.date === day.date
                      ? "border-slate-500 dark:border-slate-300"
                      : "border-transparent"
                }`}
              />
            ),
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] font-medium text-slate-400 dark:text-slate-500">
        <span>
          {days[0]?.date}〜{days.at(-1)?.date}
        </span>
        <div className="flex items-center gap-1" aria-label="色の濃さの凡例">
          <span>0分</span>
          {LEVEL_STYLES.map((style, level) => (
            <span
              key={level}
              className={`h-3 w-3 rounded-[3px] ${style}`}
            />
          ))}
          <span>120分以上</span>
        </div>
      </div>

      <div
        role="region"
        aria-live="polite"
        aria-label="選択した日の勉強内容"
        className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {formatDayLabel(selectedDay.date)}
          </p>
          <p className="text-sm font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
            {selectedDay.minutes}分
          </p>
        </div>
        <p className="mt-3 text-[10px] font-bold tracking-wide text-slate-400 dark:text-slate-500">
          勉強したタスク
        </p>
        {selectedDay.tasks.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            勉強記録はありません
          </p>
        ) : (
          <ul className="mt-2 grid gap-1.5">
            {selectedDay.tasks.map((task) => (
              <li
                key={task.taskId}
                className="flex items-start justify-between gap-3 text-xs"
              >
                <span className="min-w-0 break-words font-medium text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">
                  {task.title}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-slate-500 dark:text-slate-400">
                  {task.minutes}分
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default memo(StudyCalendar);
