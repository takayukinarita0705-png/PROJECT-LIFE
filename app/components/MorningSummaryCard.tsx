import { DAYS, dateLabel } from "@/app/lib/calendar";
import { getMorningSummary } from "@/app/lib/morningSummary";
import { formatActualMinutes } from "@/app/lib/records";
import type { LifeLog, ScheduleItem } from "@/app/types/calendar";

type MorningSummaryCardProps = {
  completionStreak: number;
  currentDay: number | null;
  currentTime: Date | null;
  logs: LifeLog[];
  onOpenActuals: () => void;
  onOpenFutureLogs: () => void;
  onOpenSchedule: () => void;
  onOpenStreak: () => void;
  todaySchedule: ScheduleItem[];
};

function SummaryStat({
  label,
  onClick,
  value,
}: {
  label: string;
  onClick?: () => void;
  value: string | number;
}) {
  const content = (
    <>
      <dt className="text-[10px] font-bold text-slate-400">{label}</dt>
      <dd className="mt-0.5 flex items-center justify-center gap-1 text-sm font-bold tabular-nums text-slate-800">
        {value}
        {onClick && (
          <span aria-hidden="true" className="text-slate-300">
            ›
          </span>
        )}
      </dd>
    </>
  );

  return (
    <div>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="w-full rounded-2xl bg-slate-50 px-2 py-2 text-center transition-colors active:bg-slate-100"
        >
          {content}
        </button>
      ) : (
        <div className="rounded-2xl bg-slate-50 px-2 py-2 text-center">
          {content}
        </div>
      )}
    </div>
  );
}

export default function MorningSummaryCard({
  completionStreak,
  currentDay,
  currentTime,
  logs,
  onOpenActuals,
  onOpenFutureLogs,
  onOpenSchedule,
  onOpenStreak,
  todaySchedule,
}: MorningSummaryCardProps) {
  const summary = getMorningSummary(todaySchedule, logs);
  const displayDate = currentTime ? dateLabel(currentTime) : "今日";
  const displayDay = currentDay === null ? "" : `（${DAYS[currentDay]}）`;

  return (
    <section
      aria-label="今日のサマリー"
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide text-slate-500">
            今日のサマリー
          </p>
          <h3 className="mt-0.5 text-lg font-bold text-slate-900">
            {displayDate}
            {displayDay}
          </h3>
        </div>
        <button
          type="button"
          onClick={onOpenStreak}
          className="rounded-2xl bg-orange-50 px-3 py-2 text-right transition-colors active:bg-orange-100"
        >
          <p className="text-[10px] font-bold text-orange-500">連続達成</p>
          <p className="flex items-center justify-end gap-1 text-sm font-bold tabular-nums text-orange-700">
            {completionStreak > 0
              ? `🔥 ${completionStreak}日`
              : "今日はまだ"}
            <span aria-hidden="true" className="text-orange-300">
              ›
            </span>
          </p>
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <SummaryStat
          label="予定"
          onClick={onOpenSchedule}
          value={`${summary.totalEvents}件`}
        />
        <SummaryStat label="完了" value={`${summary.completedEvents}件`} />
        <SummaryStat
          label="残り"
          onClick={onOpenSchedule}
          value={`${summary.remainingEvents}件`}
        />
      </dl>

      <dl className="mt-2 grid grid-cols-3 gap-2">
        <SummaryStat
          label="今日の目標"
          value={formatActualMinutes(summary.habitGoalMinutes)}
        />
        <SummaryStat
          label="現在の実績"
          onClick={onOpenActuals}
          value={formatActualMinutes(summary.habitActualMinutes)}
        />
        <SummaryStat
          label="🌱 未来を作る"
          onClick={onOpenFutureLogs}
          value={`${summary.futureInboxCount}件`}
        />
      </dl>
    </section>
  );
}
