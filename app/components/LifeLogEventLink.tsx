import type {
  CalendarEvent,
  Category,
  LifeLog,
} from "@/app/types/calendar";

export default function LifeLogEventLink({
  categories,
  events,
  log,
  onOpenEvent,
}: {
  categories: Category[];
  events: CalendarEvent[];
  log: LifeLog;
  onOpenEvent?: (log: LifeLog) => void;
}) {
  if (!log.eventId) return null;

  const event = events.find((item) => item.id === log.eventId);
  const category = event
    ? categories.find((item) => item.id === event.categoryId)
    : undefined;

  const label = `${category?.icon ?? "📅"} ${
    event
      ? event.title?.trim() || category?.name || "予定"
      : "削除済みの予定"
  }に紐付け`;

  return onOpenEvent && event ? (
    <button
      type="button"
      onClick={() => onOpenEvent(log)}
      className="mt-2 text-left text-xs font-bold text-blue-600"
    >
      {label}
    </button>
  ) : (
    <p className="mt-2 text-xs font-bold text-slate-400">
      {category?.icon ?? "📅"}{" "}
      {event
        ? event.title?.trim() || category?.name || "予定"
        : "削除済みの予定"}
      に紐付け
    </p>
  );
}
