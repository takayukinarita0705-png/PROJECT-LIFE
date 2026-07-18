"use client";

import { useEffect, useRef, useState } from "react";
import { formatActualMinutes } from "@/app/lib/records";
import { normalizeStudyDailyGoalMinutes } from "@/app/lib/studyTime";
import type { StudyTimeSummary } from "@/app/lib/studyTime";

const GOAL_OPTIONS = [30, 60, 90, 120] as const;

function useAnimatedNumber(value: number) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const from = previousValue.current;
    previousValue.current = value;
    if (
      from === value ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayValue(value);
      return;
    }

    const duration = 360;
    const startedAt = performance.now();
    let animationFrame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(
        Math.round(from + (value - from) * easedProgress),
      );
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return displayValue;
}

function parseGoal(value: string) {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 24 * 60
    ? minutes
    : null;
}

export default function StudyTimeCard({
  summary,
  onChangeDailyGoal,
  onOpenHistory,
}: {
  summary: StudyTimeSummary;
  onChangeDailyGoal: (minutes: number) => void;
  onOpenHistory: () => void;
}) {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalValue, setGoalValue] = useState(
    String(summary.dailyGoalMinutes),
  );
  const todayMinutes = useAnimatedNumber(summary.todayMinutes);
  const weekMinutes = useAnimatedNumber(summary.weekMinutes);
  const totalMinutes = useAnimatedNumber(summary.totalMinutes);
  const selectedGoal = parseGoal(goalValue);
  const graphMaximum = Math.max(
    summary.dailyGoalMinutes,
    ...summary.days.map((day) => day.minutes),
    1,
  );

  function saveGoal(minutes: number) {
    const normalized = normalizeStudyDailyGoalMinutes(minutes);
    onChangeDailyGoal(normalized);
    setGoalValue(String(normalized));
    setIsEditingGoal(false);
  }

  function toggleGoalEditor() {
    if (!isEditingGoal) {
      setGoalValue(String(summary.dailyGoalMinutes));
    }
    setIsEditingGoal(!isEditingGoal);
  }

  return (
    <section
      aria-label="今日の勉強"
      className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-indigo-600 dark:text-indigo-300">
            📚 今日の勉強
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 transition-colors duration-300 dark:text-slate-50 motion-reduce:transition-none">
            {todayMinutes}
            <span className="ml-1 text-base text-slate-400 dark:text-slate-500">
              / {summary.dailyGoalMinutes}分
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={toggleGoalEditor}
          aria-expanded={isEditingGoal}
          className="mobile-interactive min-h-11 shrink-0 rounded-xl bg-indigo-50 px-3 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
        >
          目標を変更
        </button>
      </div>

      {isEditingGoal && (
        <form
          className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"
          onSubmit={(event) => {
            event.preventDefault();
            if (selectedGoal !== null) saveGoal(selectedGoal);
          }}
        >
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
            1日の目標（分）
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={24 * 60}
              step={1}
              value={goalValue}
              onChange={(event) => setGoalValue(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold tabular-nums text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
            />
          </label>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {GOAL_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setGoalValue(String(minutes))}
                className="mobile-interactive min-h-11 rounded-xl bg-white px-2 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300"
              >
                {minutes}分
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setIsEditingGoal(false)}
              className="mobile-interactive min-h-11 flex-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={selectedGoal === null}
              className="mobile-interactive min-h-11 flex-1 rounded-xl bg-indigo-600 text-xs font-bold text-white disabled:opacity-40"
            >
              保存
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 dark:border-slate-800">
        <div>
          <p className="text-[11px] font-bold text-slate-400">今週</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {formatActualMinutes(weekMinutes)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-400">累計</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {formatActualMinutes(totalMinutes)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-slate-400 dark:text-slate-500">
          <span>今日の目標</span>
          <span className="tabular-nums">{summary.progressPercentage}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="今日の勉強時間"
          aria-valuemin={0}
          aria-valuemax={summary.dailyGoalMinutes}
          aria-valuenow={Math.min(
            summary.todayMinutes,
            summary.dailyGoalMinutes,
          )}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
        >
          <div
            className="h-full rounded-full bg-indigo-500 transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{
              width: `${Math.min(100, summary.progressPercentage)}%`,
            }}
          />
        </div>
        <p
          className={`mt-2 text-xs font-bold ${
            summary.achievedDailyGoal
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {summary.achievedDailyGoal
            ? "✅ 今日の目標達成！"
            : summary.studiedToday
              ? `目標まであと${summary.remainingGoalMinutes}分`
              : `あと1分で${summary.nextStreakDays}日継続！`}
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/80">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
            今週の勉強
          </p>
          <p className="text-[11px] font-medium text-slate-400">
            火曜はじまり
          </p>
        </div>
        <div className="grid gap-2" aria-label="今週の日別勉強時間">
          {summary.days.map((day) => (
            <div
              key={day.date}
              className="grid grid-cols-[1rem_minmax(0,1fr)_3rem] items-center gap-2"
            >
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {day.label}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-indigo-400 transition-[width] duration-500 ease-out dark:bg-indigo-500 motion-reduce:transition-none"
                  style={{
                    width: `${Math.round(
                      (day.minutes / graphMaximum) * 100,
                    )}%`,
                  }}
                />
              </div>
              <span className="text-right text-[10px] font-bold tabular-nums text-slate-400 dark:text-slate-500">
                {day.minutes}分
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm font-bold tabular-nums text-orange-700 dark:text-orange-300">
        🔥 {summary.streakDays}日継続
      </p>
      <button
        type="button"
        onClick={onOpenHistory}
        className="mobile-interactive mt-3 min-h-11 w-full rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        勉強履歴を見る →
      </button>
    </section>
  );
}
