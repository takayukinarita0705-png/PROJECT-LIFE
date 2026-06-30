export type RoutineRelation = "after-work-meal" | "after-work-bath";

export type CalendarEvent = {
  id: string;
  categoryId: string;
  day: number;
  /** 0時からの経過分 */
  start: number;
  /** 0時からの経過分。24:00は1440 */
  end: number;
  weekOffset: number;
  source?: "fixed-template";
  routineRelation?: RoutineRelation;
  routineDetached?: boolean;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

export type LegacyCalendarEvent = Omit<CalendarEvent, "categoryId"> & {
  title: string;
  color: string;
};

export type CategoryDraft = {
  id: string | null;
  name: string;
  color: string;
  icon: string;
};

export type TemplateEvent = Pick<
  CalendarEvent,
  "categoryId" | "day" | "start" | "end" | "routineRelation"
>;

export type CalendarTemplate = {
  id: string;
  name: string;
  events: TemplateEvent[];
  categories: Category[];
};

export type Draft = {
  day: number;
  start: number;
  end: number;
};

export type DropTarget = {
  day: number;
  row: number;
  pointerMinute: number;
};

export type EventMove = {
  eventId: string;
  pointerId: number;
  startX: number;
  startY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  grabOffsetMinutes: number;
};

export type SaveStatus = "saving" | "saved" | null;

export type UndoSnapshot = {
  id: number;
  events: CalendarEvent[];
};

export type ScheduleItem = {
  event: CalendarEvent;
  category: Category;
};
