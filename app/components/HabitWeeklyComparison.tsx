import {
  formatActualMinutes,
  formatSignedActualMinutes,
} from "@/app/lib/records";
import type { HabitWeeklyComparison as HabitWeeklyComparisonValue } from "@/app/lib/records";

export default function HabitWeeklyComparison({
  comparison,
}: {
  comparison: HabitWeeklyComparisonValue;
}) {
  const differenceColor =
    comparison.differenceMinutes > 0
      ? "text-emerald-700"
      : comparison.differenceMinutes < 0
        ? "text-rose-600"
        : "text-slate-600";

  return (
    <section
      aria-label="先週との比較"
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="text-xs font-bold text-slate-400">先週との比較</p>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-emerald-50 px-2 py-2">
          <dt className="text-[10px] font-bold text-emerald-700">今週</dt>
          <dd className="mt-0.5 text-xs font-bold tabular-nums text-emerald-800">
            {formatActualMinutes(comparison.currentMinutes)}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-100 px-2 py-2">
          <dt className="text-[10px] font-bold text-slate-500">先週</dt>
          <dd className="mt-0.5 text-xs font-bold tabular-nums text-slate-700">
            {formatActualMinutes(comparison.previousMinutes)}
          </dd>
        </div>
        <div className="rounded-xl bg-blue-50 px-2 py-2">
          <dt className="text-[10px] font-bold text-blue-600">差分</dt>
          <dd
            className={`mt-0.5 text-xs font-bold tabular-nums ${differenceColor}`}
          >
            {formatSignedActualMinutes(comparison.differenceMinutes)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
