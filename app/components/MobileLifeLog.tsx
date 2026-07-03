import { sortLifeLogsNewestFirst } from "@/app/lib/lifeLogs";
import type { LifeLog } from "@/app/types/calendar";

type MobileLifeLogProps = {
  hasCheckedLocalCache: boolean;
  hasLoadedState: boolean;
  logs: LifeLog[];
  onAdd: () => void;
  onDelete: (log: LifeLog) => void;
  onEdit: (log: LifeLog) => void;
};

function formatLogDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MobileLifeLog({
  hasCheckedLocalCache,
  hasLoadedState,
  logs,
  onAdd,
  onDelete,
  onEdit,
}: MobileLifeLogProps) {
  const sortedLogs = sortLifeLogsNewestFirst(logs);

  return (
    <section className="md:hidden">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
            LIFE LOG
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            ライフログ
          </h2>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm"
        >
          ＋ 新しいログ
        </button>
      </header>

      {hasCheckedLocalCache && !hasLoadedState ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          ログを読み込んでいます…
        </div>
      ) : sortedLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          まだログはありません
        </div>
      ) : (
        <div className="grid gap-2">
          {sortedLogs.map((log) => (
            <article
              key={log.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <time
                dateTime={log.createdAt}
                className="text-xs font-bold text-slate-400"
              >
                {formatLogDate(log.createdAt)}
              </time>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">
                {log.body}
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(log)}
                  className="min-h-9 rounded-lg px-3 text-xs font-bold text-slate-500"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(log)}
                  className="min-h-9 rounded-lg px-3 text-xs font-bold text-rose-600"
                >
                  削除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
