import type { HabitHeatmapDay } from "@/app/lib/records";

const LEVEL_STYLES: Record<HabitHeatmapDay["level"], string> = {
  high: "border-emerald-600 bg-emerald-600",
  partial: "border-amber-300 bg-amber-300",
  zero: "border-rose-200 bg-rose-50",
  none: "border-slate-200 bg-slate-100",
};

function getDayLabel(day: HabitHeatmapDay) {
  if (day.percentage === null) return `${day.date}：対象なし`;
  return `${day.date}：${day.completed}/${day.total}件（${day.percentage}%）`;
}

export default function HabitHeatmap({
  days,
}: {
  days: HabitHeatmapDay[];
}) {
  return (
    <section
      aria-label="直近4週間の習慣"
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="text-xs font-bold text-slate-400">
        直近4週間の習慣
      </p>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <span
            key={day.date}
            title={getDayLabel(day)}
            aria-label={getDayLabel(day)}
            className={`aspect-square rounded-md border ${LEVEL_STYLES[day.level]}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-400">
        <span>濃緑 80%以上</span>
        <span>黄 1〜79%</span>
        <span>薄赤 0%</span>
        <span>灰 対象なし</span>
      </div>
    </section>
  );
}
