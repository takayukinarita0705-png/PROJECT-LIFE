import { formatActualMinutes } from "@/app/lib/records";
import type { ScheduleRecord } from "@/app/lib/records";

type MobileWeekReviewProps = {
  hasLoadedEvents: boolean;
  record: ScheduleRecord;
};

export default function MobileWeekReview({
  hasLoadedEvents,
  record,
}: MobileWeekReviewProps) {
  return (
    <section className="md:hidden">
      <header className="mb-4">
        <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
          WEEK
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">今週</h2>
      </header>

      {!hasLoadedEvents ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          記録を読み込んでいます…
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
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
        </div>
      )}
    </section>
  );
}
