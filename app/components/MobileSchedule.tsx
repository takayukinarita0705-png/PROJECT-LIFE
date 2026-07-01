import { DAYS, dateLabel } from "@/app/lib/calendar";
import {
  formatCalendarDate,
  isEventOnDate,
} from "@/app/lib/date";
import { formatTime } from "@/app/lib/time";
import type {
  CalendarEvent,
  EventStatus,
  ScheduleItem,
} from "@/app/types/calendar";

const MINUTES_PER_DAY = 24 * 60;

function normalizeDayMinutes(minutes: number) {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function getTodayProgress(
  events: Array<{ status?: EventStatus }>,
) {
  const total = events.length;
  const completed = events.filter(
    (event) => event.status === "completed",
  ).length;
  const percentage =
    total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percentage };
}

export function getActualsByCategory(schedule: ScheduleItem[]) {
  const actualsByCategory = new Map<
    string,
    {
      categoryId: string;
      name: string;
      icon: string;
      color: string;
      minutes: number;
    }
  >();

  schedule.forEach(({ event, category }) => {
    if (event.status !== "completed") return;

    const rawDuration = event.end - event.start;
    const duration =
      rawDuration >= 0 ? rawDuration : MINUTES_PER_DAY + rawDuration;
    const current = actualsByCategory.get(category.id);
    if (current) {
      current.minutes += duration;
      return;
    }

    actualsByCategory.set(category.id, {
      categoryId: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      minutes: duration,
    });
  });

  return [...actualsByCategory.values()];
}

export function getScheduleRecord(schedule: ScheduleItem[]) {
  const total = schedule.length;
  const completed = schedule.filter(
    ({ event }) => event.status === "completed",
  ).length;
  const skipped = schedule.filter(
    ({ event }) => event.status === "skipped",
  ).length;
  const pending = total - completed - skipped;
  const actuals = getActualsByCategory(schedule);
  const totalMinutes = actuals.reduce(
    (sum, actual) => sum + actual.minutes,
    0,
  );
  const percentage =
    total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    skipped,
    pending,
    percentage,
    totalMinutes,
    actuals,
  };
}

export function formatActualMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}分`;
  if (remainingMinutes === 0) return `${hours}時間`;
  return `${hours}時間${remainingMinutes}分`;
}

function ActualsList({
  actuals,
}: {
  actuals: ReturnType<typeof getActualsByCategory>;
}) {
  if (actuals.length === 0) {
    return (
      <p className="mt-1 text-xs text-slate-400">
        完了した予定はまだありません
      </p>
    );
  }

  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {actuals.map((actual) => (
        <li
          key={actual.categoryId}
          className="flex items-center gap-1.5 rounded-lg border bg-slate-50 px-2 py-1 text-xs"
          style={{ borderColor: actual.color }}
        >
          <span aria-hidden="true">{actual.icon}</span>
          <span className="font-bold text-slate-700">{actual.name}</span>
          <span className="font-bold tabular-nums text-slate-500">
            {formatActualMinutes(actual.minutes)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ActualsSection({
  title,
  actuals,
}: {
  title: string;
  actuals: ReturnType<typeof getActualsByCategory>;
}) {
  return (
    <section
      aria-label={title}
      className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
    >
      <p className="text-xs font-bold tracking-wide text-slate-500">
        {title}
      </p>
      <ActualsList actuals={actuals} />
    </section>
  );
}

function WeeklyRecordSection({
  record,
}: {
  record: ReturnType<typeof getScheduleRecord>;
}) {
  return (
    <section
      aria-label="今週の記録"
      className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold tracking-wide text-slate-500">
          今週の記録
        </p>
        <p className="text-lg font-bold tabular-nums text-emerald-700">
          {record.percentage}%
        </p>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-emerald-50 px-2 py-1.5">
          <dt className="text-[10px] font-bold text-emerald-700">完了</dt>
          <dd className="font-bold tabular-nums text-emerald-800">
            {record.completed}件
          </dd>
        </div>
        <div className="rounded-lg bg-slate-100 px-2 py-1.5">
          <dt className="text-[10px] font-bold text-slate-500">
            スキップ
          </dt>
          <dd className="font-bold tabular-nums text-slate-700">
            {record.skipped}件
          </dd>
        </div>
        <div className="rounded-lg bg-blue-50 px-2 py-1.5">
          <dt className="text-[10px] font-bold text-blue-600">実績時間</dt>
          <dd className="font-bold tabular-nums text-blue-700">
            {formatActualMinutes(record.totalMinutes)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[10px] font-bold text-slate-400">
        カテゴリ別実績
      </p>
      <ActualsList actuals={record.actuals} />
    </section>
  );
}

export function isCurrentMobileEvent(
  event: CalendarEvent,
  currentDate: string | null,
  currentMinutes: number | null,
) {
  if (
    currentDate === null ||
    currentMinutes === null ||
    !isEventOnDate(event, currentDate)
  ) {
    return false;
  }

  const duration = event.end - event.start;
  if (duration >= MINUTES_PER_DAY) return true;
  if (duration === 0) return false;

  const start = normalizeDayMinutes(event.start);
  const end = normalizeDayMinutes(event.end);
  const now = normalizeDayMinutes(currentMinutes);

  if (start < end && duration > 0) {
    return start <= now && now < end;
  }

  return start <= now || now < end;
}

type MobileScheduleProps = {
  currentTime: Date | null;
  currentDay: number | null;
  hasLoadedEvents: boolean;
  onResetStatus: (eventId: string) => void;
  onToggleCompleted: (eventId: string) => void;
  onToggleSkipped: (eventId: string) => void;
  todaySchedule: ScheduleItem[];
  weekSchedule: ScheduleItem[];
};

export default function MobileSchedule({
  currentTime,
  currentDay,
  hasLoadedEvents,
  onResetStatus,
  onToggleCompleted,
  onToggleSkipped,
  todaySchedule,
  weekSchedule,
}: MobileScheduleProps) {
  const currentMinutes =
    currentTime === null
      ? null
      : currentTime.getHours() * 60 +
        currentTime.getMinutes() +
        currentTime.getSeconds() / 60;
  const currentDate =
    currentTime === null ? null : formatCalendarDate(currentTime);
  const todayProgress = getTodayProgress(
    todaySchedule.map(({ event }) => event),
  );
  const todayActuals = getActualsByCategory(todaySchedule);
  const weekRecord = getScheduleRecord(weekSchedule);

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

      {hasLoadedEvents && currentDay !== null && (
        <section
          aria-label="今日の達成状況"
          className="mb-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-wide text-emerald-700">
                今日の達成状況
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-700">
                {todayProgress.completed} / {todayProgress.total} 件完了
              </p>
            </div>
            <p className="text-xl font-bold tabular-nums text-emerald-700">
              {todayProgress.percentage}%
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="今日の予定の達成率"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={todayProgress.percentage}
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${todayProgress.percentage}%` }}
            />
          </div>
        </section>
      )}

      {hasLoadedEvents && currentDay !== null && (
        <ActualsSection title="今日の実績" actuals={todayActuals} />
      )}

      {hasLoadedEvents && currentDay !== null && (
        <WeeklyRecordSection record={weekRecord} />
      )}

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
            const displayTitle = event.title?.trim() || category.name;
            const isCompleted = event.status === "completed";
            const isSkipped = event.status === "skipped";
            const isCurrent =
              !isCompleted &&
              !isSkipped &&
              isCurrentMobileEvent(
                event,
                currentDate,
                currentMinutes,
              );

            return (
              <article
                key={event.id}
                aria-current={isCurrent ? "time" : undefined}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border border-l-4 px-3 py-2 text-left shadow-sm ${
                  isCompleted
                    ? "border-emerald-200 bg-emerald-50"
                    : isSkipped
                      ? "border-dashed border-slate-300 bg-slate-100"
                      : isCurrent
                    ? "border-rose-400 bg-rose-50 outline outline-2 outline-rose-300 shadow-md"
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
                    <h3
                      className={`truncate font-bold ${
                        isCompleted
                          ? "text-emerald-700 line-through"
                          : isSkipped
                            ? "text-slate-400 line-through"
                            : "text-slate-900"
                      }`}
                    >
                      {displayTitle}
                    </h3>
                    {isCurrent && (
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                        進行中
                      </span>
                    )}
                    {isSkipped && (
                      <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        スキップ
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm font-medium tabular-nums ${
                      isSkipped ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {formatTime(event.start)}〜{formatTime(event.end)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isCompleted || isSkipped ? (
                    <button
                      type="button"
                      onClick={() => onResetStatus(event.id)}
                      aria-label={`${displayTitle}を未完了に戻す`}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-700 text-white"
                      }`}
                    >
                      戻す
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onToggleSkipped(event.id)}
                        className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-500"
                      >
                        スキップ
                      </button>
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => onToggleCompleted(event.id)}
                        aria-label={`${displayTitle}を完了`}
                        className="h-6 w-6 cursor-pointer accent-emerald-600"
                      />
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
