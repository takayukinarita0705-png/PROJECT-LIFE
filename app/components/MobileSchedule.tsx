import { DAYS, dateLabel } from "@/app/lib/calendar";
import { formatTime } from "@/app/lib/time";
import type { ScheduleItem } from "@/app/types/calendar";

type MobileScheduleProps = {
  currentTime: Date | null;
  currentDay: number | null;
  hasLoadedEvents: boolean;
  todaySchedule: ScheduleItem[];
  currentScheduleEventId?: string;
};

export default function MobileSchedule({
  currentTime,
  currentDay,
  hasLoadedEvents,
  todaySchedule,
  currentScheduleEventId,
}: MobileScheduleProps) {
  return (
    <section className="md:hidden">
      <header className="mb-3">
        <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
          TODAY
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">
            今日のスケジュール
          </h2>
          {currentTime && currentDay !== null && (
            <p className="shrink-0 text-sm font-bold text-slate-500">
              {dateLabel(currentTime)}（{DAYS[currentDay]}）
            </p>
          )}
        </div>
      </header>

      {!hasLoadedEvents || currentDay === null ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          予定を読み込んでいます…
        </div>
      ) : todaySchedule.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          今日の予定はありません
        </div>
      ) : (
        <div className="grid gap-1.5">
          {todaySchedule.map(({ event, category }) => {
            const isCurrent = currentScheduleEventId === event.id;

            return (
              <article
                key={event.id}
                aria-current={isCurrent ? "time" : undefined}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border border-l-4 px-3 py-2 text-left shadow-sm ${
                  isCurrent
                    ? "border-rose-300 bg-rose-50 ring-2 ring-rose-300 ring-offset-1"
                    : "border-slate-200 bg-white"
                }`}
                style={{ borderLeftColor: category.color }}
              >
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg text-white"
                  style={{ background: category.color }}
                >
                  {category.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold text-slate-900">
                      {category.name}
                    </h3>
                    {isCurrent && (
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                        進行中
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium tabular-nums text-slate-500">
                    {formatTime(event.start)}〜{formatTime(event.end)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
