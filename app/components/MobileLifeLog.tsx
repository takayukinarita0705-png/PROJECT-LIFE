import { getLifeLogTimelineGroups } from "@/app/lib/lifeLogs";
import type {
  CalendarEvent,
  Category,
  LifeLog,
} from "@/app/types/calendar";

type MobileLifeLogProps = {
  categories: Category[];
  events: CalendarEvent[];
  hasCheckedLocalCache: boolean;
  hasLoadedState: boolean;
  logs: LifeLog[];
  onAdd: () => void;
  onDelete: (log: LifeLog) => void;
  onEdit: (log: LifeLog) => void;
};

function formatLogTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MobileLifeLog({
  categories,
  events,
  hasCheckedLocalCache,
  hasLoadedState,
  logs,
  onAdd,
  onDelete,
  onEdit,
}: MobileLifeLogProps) {
  const timelineGroups = getLifeLogTimelineGroups(logs);
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );

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
      ) : timelineGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          まだログはありません
        </div>
      ) : (
        <div className="grid gap-5">
          {timelineGroups.map((group) => (
            <section key={group.date} aria-labelledby={`log-date-${group.date}`}>
              <h3
                id={`log-date-${group.date}`}
                className="mb-2 text-sm font-bold text-slate-600"
              >
                {group.label}
              </h3>
              <div className="relative ml-3 border-l-2 border-slate-200 pl-5">
                {group.logs.map((log) => {
                  const linkedEvent = log.eventId
                    ? eventsById.get(log.eventId)
                    : undefined;
                  const linkedCategory = linkedEvent
                    ? categoriesById.get(linkedEvent.categoryId)
                    : undefined;

                  return (
                    <article
                      key={log.id}
                      className="relative pb-4 last:pb-0"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400 ring-1 ring-slate-200"
                      />
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <time
                          dateTime={log.createdAt}
                          className="text-xs font-bold tabular-nums text-slate-400"
                        >
                          {formatLogTime(log.createdAt)}
                        </time>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
                          {log.body}
                        </p>
                        {log.eventId && (
                          <p className="mt-2 text-xs font-bold text-slate-400">
                            {linkedCategory?.icon ?? "📅"}{" "}
                            {linkedEvent
                              ? linkedEvent.title?.trim() ||
                                linkedCategory?.name ||
                                "予定"
                              : "削除済みの予定"}
                            に紐付け
                          </p>
                        )}
                        <div className="mt-2 flex justify-end gap-2">
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
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
