import { formatActualMinutes } from "@/app/lib/records";
import type { WeeklyMvp } from "@/app/lib/records";

function formatDifference(minutes: number) {
  if (minutes === 0) return "±0分";
  const sign = minutes > 0 ? "+" : "-";
  return `${sign}${formatActualMinutes(Math.abs(minutes))}`;
}

export default function WeeklyMvpCard({
  mvp,
}: {
  mvp: WeeklyMvp | null;
}) {
  return (
    <section
      aria-label="今週一番頑張ったこと"
      className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3"
    >
      <p className="text-xs font-bold text-amber-700">
        🏆 今週一番頑張ったこと
      </p>
      {mvp === null ? (
        <p className="mt-2 text-sm font-bold text-slate-500">
          今週の完了実績はまだありません
        </p>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: mvp.color }}
            />
            <span aria-hidden="true">{mvp.icon}</span>
            <p className="font-bold text-slate-800">{mvp.name}</p>
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">
            {formatActualMinutes(mvp.minutes)}
          </p>
          {mvp.hasPreviousData ? (
            <p className="mt-2 text-xs font-bold text-slate-500">
              先週より{" "}
              <span className="tabular-nums text-emerald-700">
                {formatDifference(mvp.differenceMinutes)}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-xs font-bold text-slate-500">
              今週から記録を開始しました
            </p>
          )}
        </>
      )}
    </section>
  );
}
