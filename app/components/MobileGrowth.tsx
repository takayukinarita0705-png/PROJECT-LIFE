import { formatActualMinutes } from "@/app/lib/records";
import type {
  GrowthDailyPoint,
  GrowthDashboard,
  GrowthRecentItem,
} from "@/app/lib/growth";

function GrowthBarChart({
  points,
  valueKey,
  colorClass,
  unit,
  ariaLabel,
}: {
  points: GrowthDailyPoint[];
  valueKey: "studyMinutes" | "completedTasks";
  colorClass: string;
  unit: string;
  ariaLabel: string;
}) {
  const maximum = Math.max(
    1,
    ...points.map((point) => point[valueKey]),
  );
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="flex h-24 items-end gap-0.5 border-b border-slate-200 dark:border-slate-700">
        {points.map((point) => {
          const value = point[valueKey];
          return (
            <span
              key={point.date}
              title={`${point.label}: ${value}${unit}`}
              className={`min-w-0 flex-1 rounded-t-[2px] transition-[height] duration-300 motion-reduce:transition-none ${
                value === 0
                  ? "bg-slate-100 dark:bg-slate-800"
                  : colorClass
              }`}
              style={{
                height:
                  value === 0
                    ? "2px"
                    : `${Math.max(5, Math.round((value / maximum) * 100))}%`,
              }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[9px] font-medium text-slate-400 dark:text-slate-500">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points.at(-1)?.label}</span>
      </div>
    </div>
  );
}

function formatRecentTimestamp(item: GrowthRecentItem) {
  const date = new Date(item.timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function MobileGrowth({
  dashboard,
}: {
  dashboard: GrowthDashboard;
}) {
  return (
    <section className="md:hidden">
      <header className="mb-4">
        <p className="text-xs font-bold tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
          GROWTH
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
          🌱 積み上げ
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          未来へ積み上げた行動の記録
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {[
          ["📚 勉強時間", formatActualMinutes(dashboard.totalStudyMinutes)],
          ["🔥 最長継続", `${dashboard.longestStudyStreak}日`],
          ["✅ 完了タスク", `${dashboard.totalCompletedTasks}件`],
          ["📝 LifeLog登録", `${dashboard.totalLifeLogs}件`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {label}
            </p>
            <p className="mt-2 break-words text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {value}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          今月
        </h3>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {[
            ["勉強時間", formatActualMinutes(dashboard.monthStudyMinutes)],
            ["完了タスク", `${dashboard.monthCompletedTasks}件`],
            ["LifeLog登録", `${dashboard.monthLifeLogs}件`],
            ["ルーティン達成率", `${dashboard.monthRoutineAchievementRate}%`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"
            >
              <dt className="text-[11px] font-bold text-slate-400">
                {label}
              </dt>
              <dd className="mt-1 text-base font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          最近30日
        </h3>
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-indigo-600 dark:text-indigo-300">
            勉強時間
          </p>
          <GrowthBarChart
            points={dashboard.dailyPoints}
            valueKey="studyMinutes"
            colorClass="bg-indigo-500 dark:bg-indigo-400"
            unit="分"
            ariaLabel="最近30日の勉強時間グラフ"
          />
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="mb-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">
            完了タスク数
          </p>
          <GrowthBarChart
            points={dashboard.dailyPoints}
            valueKey="completedTasks"
            colorClass="bg-emerald-500 dark:bg-emerald-400"
            unit="件"
            ariaLabel="最近30日の完了タスク数グラフ"
          />
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          達成マイルストーン
        </h3>
        <div className="mt-3 grid gap-2">
          {dashboard.milestones.map((milestone) => (
            <div
              key={milestone.hours}
              className={`rounded-2xl border p-3 ${
                milestone.achieved
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50"
                  : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {milestone.achieved ? "✅" : "○"} 累計{milestone.hours}時間
                </p>
                {!milestone.achieved && (
                  <p className="text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
                    あと{formatActualMinutes(milestone.remainingMinutes)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            最近の積み上げ
          </h3>
          <p className="text-[11px] font-medium text-slate-400">最新10件</p>
        </div>
        {dashboard.recentItems.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            まだ積み上げの記録はありません
          </p>
        ) : (
          <ol className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {dashboard.recentItems.map((item) => (
              <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800">
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-bold text-slate-800 [overflow-wrap:anywhere] dark:text-slate-100">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {item.detail}
                  </p>
                </div>
                <time
                  dateTime={item.timestamp}
                  className="shrink-0 text-[10px] tabular-nums text-slate-400 dark:text-slate-500"
                >
                  {formatRecentTimestamp(item)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
