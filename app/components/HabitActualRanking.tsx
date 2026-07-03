import {
  formatActualMinutes,
  getHabitActualRanking,
} from "@/app/lib/records";
import type { CategoryActual } from "@/app/lib/records";

export default function HabitActualRanking({
  actuals,
}: {
  actuals: CategoryActual[];
}) {
  const ranking = getHabitActualRanking(actuals);

  return (
    <section
      aria-label="習慣実績ランキング"
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="text-xs font-bold text-slate-400">
        習慣実績ランキング
      </p>
      {ranking.length === 0 ? (
        <p className="mt-1 text-xs text-slate-400">
          対象の実績はまだありません
        </p>
      ) : (
        <ol className="mt-2 grid gap-1.5">
          {ranking.map((actual, index) => (
            <li
              key={actual.categoryId}
              className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs"
            >
              <span className="w-7 shrink-0 font-bold tabular-nums text-slate-400">
                {index + 1}位
              </span>
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: actual.color }}
              />
              <span aria-hidden="true">{actual.icon}</span>
              <span className="min-w-0 flex-1 truncate font-bold text-slate-700">
                {actual.name}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-slate-500">
                {formatActualMinutes(actual.minutes)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
