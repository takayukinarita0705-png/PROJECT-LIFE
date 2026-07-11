import ActualsList from "./ActualsList";
import HabitActualRanking from "./HabitActualRanking";
import HabitHeatmap from "./HabitHeatmap";
import HabitWeeklyComparison from "./HabitWeeklyComparison";
import FutureLifeLogProgress from "./FutureLifeLogProgress";
import WeeklyMvpCard from "./WeeklyMvpCard";
import WeeklyLifeLogs from "./WeeklyLifeLogs";
import WeeklyCategoryGoals from "./WeeklyCategoryGoals";
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
  FutureLifeLogWeeklyRecord,
} from "@/app/lib/lifeLogs";
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
  futureLifeLogRecord: FutureLifeLogWeeklyRecord;
  isReviewDay: boolean;
  logs: LifeLog[];
  onViewAllLogs: () => void;
  onSaveWeeklyGoal: (
    categoryId: string,
    goalMinutes?: number,
  ) => void;
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
  futureLifeLogRecord,
  isReviewDay,
  logs,
  onViewAllLogs,
  onSaveWeeklyGoal,
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

      {hasCheckedLocalCache && !hasLoadedEvents ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          記録を読み込んでいます…
        </div>
      ) : hasLoadedEvents ? (
        <div className="grid gap-3">
          <section
            aria-label="水曜レビュー"
            className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-bold text-violet-500">
              水曜レビュー
            </p>
            {isReviewDay && (
              <p className="mt-2 rounded-2xl bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
                今日は週間レビューの日です
              </p>
            )}
            <WeeklyMvpCard mvp={weeklyMvp} />
            <FutureLifeLogProgress record={futureLifeLogRecord} />
            <div className="mt-3 rounded-2xl bg-violet-50 px-4 py-3">
              <p className="text-xs font-bold text-violet-500">今週の一言</p>
              <p className="mt-1 text-sm font-bold text-violet-800">
                {getWeeklyReviewMessage(record.percentage)}
              </p>
            </div>
          </section>

          <section
            aria-label="今週の達成率"
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="border-b border-slate-100 pb-3">
              <p className="text-xs font-bold text-slate-400">今週の達成率</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700">
                {record.percentage}%
              </p>
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
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-400">
                カテゴリ別実績時間
              </p>
              <ActualsList actuals={record.actuals} />
            </div>
          </section>

          <HabitWeeklyComparison comparison={habitWeeklyComparison} />
          <WeeklyCategoryGoals
            actuals={record.actuals}
            categories={categories}
            onSave={onSaveWeeklyGoal}
          />
          <HabitActualRanking actuals={record.actuals} />
          <HabitHeatmap days={habitHeatmap} />
          <section
            aria-label="連続達成"
            className="rounded-3xl border border-amber-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-bold text-amber-600">連続達成</p>
            <p className="mt-2 text-sm font-bold text-amber-800">
              {completionStreak > 0
                ? `🔥 ${completionStreak}日連続達成中`
                : "今日はまだ記録がありません"}
            </p>
          </section>
          <WeeklyLifeLogs
            categories={categories}
            events={events}
            logs={logs}
            onViewAll={onViewAllLogs}
          />
        </div>
      ) : null}
    </section>
  );
}
