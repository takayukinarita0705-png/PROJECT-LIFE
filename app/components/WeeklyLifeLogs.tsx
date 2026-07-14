import LifeLogEventLink from "./LifeLogEventLink";
import {
  formatLifeLogTime,
  sortLifeLogsForDisplay,
} from "@/app/lib/lifeLogs";
import type {
  CalendarEvent,
  Category,
  LifeLog,
} from "@/app/types/calendar";

export default function WeeklyLifeLogs({
  categories,
  events,
  logs,
  onViewAll,
}: {
  categories: Category[];
  events: CalendarEvent[];
  logs: LifeLog[];
  onViewAll: () => void;
}) {
  const latestLogs = sortLifeLogsForDisplay(logs, events).slice(0, 3);

  return (
    <section
      aria-label="今週のログ"
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">
          📝 今週のログ {logs.length}件
        </p>
        {logs.length >= 3 && (
          <button
            type="button"
            onClick={onViewAll}
            className="mobile-interactive min-h-11 rounded-xl bg-blue-50 px-3 text-xs font-bold text-blue-600"
          >
            すべて見る
          </button>
        )}
      </div>
      {latestLogs.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">
          今週のログはまだありません
        </p>
      ) : (
        <div className="mt-2 grid gap-1.5">
          {latestLogs.map((log) => (
            <article
              key={log.id}
              className="rounded-2xl bg-slate-50 p-3"
            >
              <div className="flex gap-2">
                <time
                  dateTime={log.createdAt}
                  className="shrink-0 text-xs font-bold tabular-nums text-slate-400"
                >
                  {formatLifeLogTime(log.createdAt)}
                </time>
                <p className="min-w-0 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700 [overflow-wrap:anywhere]">
                  {log.title || log.body}
                </p>
              </div>
              <LifeLogEventLink
                categories={categories}
                events={events}
                log={log}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
