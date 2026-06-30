import type { PointerEvent as ReactPointerEvent } from "react";
import { formatTime, getEventPosition, MINUTES_PER_ROW } from "@/app/lib/time";
import type {
  CalendarEvent,
  Category,
  EventMove,
} from "@/app/types/calendar";

type EventCardProps = {
  event: CalendarEvent;
  category: Category;
  rowStart: number;
  eventMove: EventMove | null;
  onPointerDown: (
    event: CalendarEvent,
    pointerEvent: ReactPointerEvent<HTMLDivElement>,
  ) => void;
  onPointerMove: (pointerEvent: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (pointerEvent: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (pointerEvent: ReactPointerEvent<HTMLDivElement>) => void;
  onDelete: (id: string) => void;
};

export default function EventCard({
  event,
  category,
  rowStart,
  eventMove,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDelete,
}: EventCardProps) {
  const position = getEventPosition(event, rowStart);
  const isCompact = event.end - event.start <= MINUTES_PER_ROW;
  const timeLabel = `${formatTime(event.start)}〜${formatTime(event.end)}`;

  return (
    <div
      title={`${category.icon} ${category.name} ${timeLabel}`}
      aria-grabbed={eventMove?.eventId === event.id}
      className={`absolute z-10 box-border touch-none overflow-hidden text-white transition-[opacity,transform] duration-150 ${
        eventMove?.eventId === event.id
          ? "cursor-grabbing opacity-35 scale-[0.98]"
          : "cursor-grab opacity-100"
      } ${
        isCompact
          ? "left-1 right-1 rounded px-1 text-[10px] leading-none"
          : "left-1 right-1 rounded p-1 text-xs shadow"
      }`}
      style={{
        background: category.color,
        height: position.height,
        top: position.top,
      }}
      onPointerDown={(pointerEvent) => onPointerDown(event, pointerEvent)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {isCompact ? (
        <div className="truncate pr-5 font-bold leading-[16px]">
          {category.icon} {category.name}{" "}
          <span className="font-normal opacity-90">{timeLabel}</span>
        </div>
      ) : (
        <>
          <div className="truncate pr-5 font-bold">
            {category.icon} {category.name}
          </div>
          <div className="truncate opacity-80">{timeLabel}</div>
        </>
      )}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(event.id);
        }}
        aria-label={`${category.name}を削除`}
        className="absolute right-1 top-0 rounded bg-black/20 px-1 text-[10px] leading-[14px]"
      >
        ×
      </button>
    </div>
  );
}
