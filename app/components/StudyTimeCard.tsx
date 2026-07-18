import { formatActualMinutes } from "@/app/lib/records";
import { DAILY_STUDY_TARGET_MINUTES } from "@/app/lib/studyTime";
import type { StudyTimeSummary } from "@/app/lib/studyTime";

export default function StudyTimeCard({
  summary,
}: {
  summary: StudyTimeSummary;
}) {
  return (
    <section
      aria-label="今日の勉強"
      className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wide text-indigo-600 dark:text-indigo-300">
            📚 今日の勉強
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
            {summary.todayMinutes}分
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums text-orange-700 dark:text-orange-300">
            🔥 {summary.streakDays}日継続
          </p>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {summary.studiedToday
              ? "今日の学習を記録しました"
              : `今日も勉強すると${summary.nextStreakDays}日継続になります`}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-slate-400 dark:text-slate-500">
          <span>今日の進捗</span>
          <span>目安 {DAILY_STUDY_TARGET_MINUTES}分</span>
        </div>
        <div
          role="progressbar"
          aria-label="今日の勉強時間"
          aria-valuemin={0}
          aria-valuemax={DAILY_STUDY_TARGET_MINUTES}
          aria-valuenow={Math.min(
            summary.todayMinutes,
            DAILY_STUDY_TARGET_MINUTES,
          )}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
        >
          <div
            className="h-full rounded-full bg-indigo-500 transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${summary.progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
          今週
        </p>
        <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
          {formatActualMinutes(summary.weekMinutes)}
        </p>
      </div>
    </section>
  );
}
