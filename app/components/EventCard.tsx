import { useRef } from "react";
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
  onEdit?: (event: CalendarEvent) => void;
  readOnly?: boolean;
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
  onEdit,
  readOnly = false,
}: EventCardProps) {
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const pointerDidMoveRef = useRef(false);
  const position = getEventPosition(event, rowStart);
  const isCompact = event.end - event.start <= MINUTES_PER_ROW;
  const timeLabel = `${formatTime(event.start)}〜${formatTime(event.end)}`;
  const displayTitle = event.title?.trim() || category.name;

  return (
    <div
      title={`${category.icon} ${displayTitle} ${timeLabel}`}
      aria-grabbed={eventMove?.eventId === event.id}
      className={`absolute z-10 box-border touch-none overflow-hidden text-white transition-[opacity,transform] duration-150 ${
        eventMove?.eventId === event.id
          ? "cursor-grabbing opacity-35 scale-[0.98]"
          : readOnly
            ? onEdit
              ? "cursor-pointer opacity-100"
              : "cursor-default opacity-100"
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
      onPointerDown={
        readOnly
          ? undefined
          : (pointerEvent) => {
              pointerOriginRef.current = {
                x: pointerEvent.clientX,
                y: pointerEvent.clientY,
              };
              pointerDidMoveRef.current = false;
              onPointerDown(event, pointerEvent);
            }
      }
      onPointerMove={
        readOnly
          ? undefined
          : (pointerEvent) => {
              const origin = pointerOriginRef.current;
              if (
                origin &&
                Math.hypot(
                  pointerEvent.clientX - origin.x,
                  pointerEvent.clientY - origin.y,
                ) >= 4
              ) {
                pointerDidMoveRef.current = true;
              }
              onPointerMove(pointerEvent);
            }
      }
      onPointerUp={
        readOnly
          ? undefined
          : (pointerEvent) => {
              onPointerUp(pointerEvent);
              if (!pointerDidMoveRef.current) onEdit?.(event);
            }
      }
      onPointerCancel={readOnly ? undefined : onPointerCancel}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (readOnly) onEdit?.(event);
      }}
    >
      {isCompact ? (
        <div className="truncate pr-5 font-bold leading-[16px]">
          {category.icon} {displayTitle}{" "}
          <span className="font-normal opacity-90">{timeLabel}</span>
        </div>
      ) : (
        <>
          <div className="truncate pr-5 font-bold">
            {category.icon} {displayTitle}
          </div>
          <div className="truncate opacity-80">{timeLabel}</div>
        </>
      )}
      {!readOnly && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(event.id);
          }}
          aria-label={`${displayTitle}を削除`}
          className="absolute right-1 top-0 rounded bg-black/20 px-1 text-[10px] leading-[14px]"
        >
          ×
        </button>
      )}
    </div>
  );
}
