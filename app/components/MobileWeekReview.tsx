import ActualsList from "./ActualsList";
import HabitActualRanking from "./HabitActualRanking";
import HabitHeatmap from "./HabitHeatmap";
import HabitWeeklyComparison from "./HabitWeeklyComparison";
import WeeklyMvpCard from "./WeeklyMvpCard";
import WeeklyLifeLogs from "./WeeklyLifeLogs";
import {
  formatActualMinutes,
  getWeeklyReviewMessage,
} from "@/app/lib/records";
import type {
  HabitHeatmapDay,
  HabitWeeklyComparison as HabitWeeklyComparisonValue,
  ScheduleRecord,
  WeeklyMvp,
} from "@/app/lib/records";
import type {
  CalendarEvent,
  Category,
  LifeLog,
} from "@/app/types/calendar";

type MobileWeekReviewProps = {
  categories: Category[];
  completionStreak: number;
  events: CalendarEvent[];
  hasCheckedLocalCache: boolean;
  hasLoadedEvents: boolean;
  habitHeatmap: HabitHeatmapDay[];
  habitWeeklyComparison: HabitWeeklyComparisonValue;
  isReviewDay: boolean;
  logs: LifeLog[];
  onViewAllLogs: () => void;
  record: ScheduleRecord;
  weeklyMvp: WeeklyMvp | null;
};

export default function MobileWeekReview({
  categories,
  completionStreak,
  events,
  hasCheckedLocalCache,
  hasLoadedEvents,
  habitHeatmap,
  habitWeeklyComparison,
  isReviewDay,
  logs,
  onViewAllLogs,
  record,
  weeklyMvp,
}: MobileWeekReviewProps) {
  return (
    <section className="md:hidden">
      <header className="mb-4">
        <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
          WEEK
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">今週</h2>
      </header>

      {isReviewDay && (
        <p className="mb-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
          今日は週間レビューの日です
        </p>
      )}

      {hasCheckedLocalCache && !hasLoadedEvents ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          記録を読み込んでいます…
        </div>
      ) : hasLoadedEvents ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-amber-800">
              {completionStreak > 0
                ? `🔥 ${completionStreak}日連続達成中`
                : "今日はまだ記録がありません"}
            </p>
          </div>
          <div className="border-b border-slate-100 pb-3">
            <div>
              <p className="text-xs font-bold text-slate-400">今週の達成率</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700">
                {record.percentage}%
              </p>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-emerald-50 px-2 py-3">
              <dt className="text-[10px] font-bold text-emerald-700">
                完了数
              </dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-emerald-800">
                {record.completed}件
              </dd>
            </div>
            <div className="rounded-xl bg-slate-100 px-2 py-3">
              <dt className="text-[10px] font-bold text-slate-500">
                スキップ数
              </dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-700">
                {record.skipped}件
              </dd>
            </div>
            <div className="rounded-xl bg-blue-50 px-2 py-3">
              <dt className="text-[10px] font-bold text-blue-600">
                合計実績時間
              </dt>
              <dd className="mt-0.5 text-sm font-bold tabular-nums text-blue-700">
                {formatActualMinutes(record.totalMinutes)}
              </dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-slate-400">
              カテゴリ別実績時間
            </p>
            <ActualsList actuals={record.actuals} />
          </div>
          <HabitActualRanking actuals={record.actuals} />
          <HabitWeeklyComparison comparison={habitWeeklyComparison} />
          <HabitHeatmap days={habitHeatmap} />
          <WeeklyMvpCard mvp={weeklyMvp} />
          <WeeklyLifeLogs
            categories={categories}
            events={events}
            logs={logs}
            onViewAll={onViewAllLogs}
          />
          <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3">
            <p className="text-xs font-bold text-violet-500">今週の一言</p>
            <p className="mt-1 text-sm font-bold text-violet-800">
              {getWeeklyReviewMessage(record.percentage)}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
