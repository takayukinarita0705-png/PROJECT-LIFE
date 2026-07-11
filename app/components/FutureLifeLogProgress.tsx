import type { FutureLifeLogWeeklyRecord } from "@/app/lib/lifeLogs";

const STEPS: Array<{
  key: keyof FutureLifeLogWeeklyRecord;
  label: string;
}> = [
  { key: "total", label: "思いついたこと" },
  { key: "future", label: "未来を作る" },
  { key: "scheduled", label: "予定化" },
  { key: "done", label: "完了" },
];

export default function FutureLifeLogProgress({
  record,
}: {
  record: FutureLifeLogWeeklyRecord;
}) {
  const max = Math.max(1, record.total, record.future, record.scheduled, record.done);

  return (
    <section
      aria-label="思いつきを未来に変える"
      className="mt-3 rounded-2xl bg-amber-50 px-4 py-3"
    >
      <p className="text-xs font-bold text-amber-700">
        思いつきを未来に変える
      </p>
      <dl className="mt-3 grid gap-2">
        {STEPS.map(({ key, label }) => {
          const count = record[key];
          const width = `${Math.round((count / max) * 100)}%`;

          return (
            <div key={key}>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs font-bold text-slate-600">{label}</dt>
                <dd className="text-xs font-bold tabular-nums text-slate-800">
                  {count}件
                </dd>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
