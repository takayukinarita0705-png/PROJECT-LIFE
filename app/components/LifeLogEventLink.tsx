import type {
  CalendarEvent,
  Category,
  LifeLog,
} from "@/app/types/calendar";

export default function LifeLogEventLink({
  categories,
  events,
  log,
}: {
  categories: Category[];
  events: CalendarEvent[];
  log: LifeLog;
}) {
  if (!log.eventId) return null;

  const event = events.find((item) => item.id === log.eventId);
  const category = event
    ? categories.find((item) => item.id === event.categoryId)
    : undefined;

  return (
    <p className="mt-2 text-xs font-bold text-slate-400">
      {category?.icon ?? "📅"}{" "}
      {event
        ? event.title?.trim() || category?.name || "予定"
        : "削除済みの予定"}
      に紐付け
    </p>
  );
}
