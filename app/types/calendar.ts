export type RoutineRelation = "after-work-meal" | "after-work-bath";
export type EventMode = "fixed" | "linked" | "flexible";
export type EventStatus = "pending" | "active" | "completed" | "skipped";
export type EventLinkType = "after" | "before" | "none";

export type CalendarEvent = {
  id: string;
  title?: string;
  categoryId: string;
  mode: EventMode;
  status: EventStatus;
  linkedToEventId?: string;
  linkType: EventLinkType;
  offsetMinutes: number;
  /** 予定日のローカル日付（YYYY-MM-DD） */
  date?: string;
  day: number;
  /** 0時からの経過分 */
  start: number;
  /** 0時からの経過分。日付をまたぐ場合は1440を超える */
  end: number;
  /** 終了日のローカル日付。日付をまたぐ予定で使用する */
  endDate?: string;
  weekOffset: number;
  source?: "fixed-template";
  lifeLogId?: string;
  notificationMinutes: number | null;
  notificationSentAt?: string;
  completedAt?: string;
  routineRelation?: RoutineRelation;
  routineDetached?: boolean;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  group: string;
  weeklyGoalMinutes?: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryDraft = {
  id: string | null;
  name: string;
  color: string;
  icon: string;
};

export type TemplateEvent = Pick<
  CalendarEvent,
  | "title"
  | "categoryId"
  | "mode"
  | "day"
  | "start"
  | "end"
  | "routineRelation"
>;

export type Template = {
  id: string;
  name: string;
  description: string;
  events: TemplateEvent[];
  categories: Category[];
  createdAt: string;
  updatedAt: string;
};

export type CalendarTemplate = Template;

export type LifeLogStatus = "inbox" | "scheduled" | "done";
export type LifeLogFocusArea =
  | "now"
  | "future"
  | "review"
  | "discard"
  | "unset";

export type LifeLog = {
  id: string;
  title?: string;
  body: string;
  status: LifeLogStatus;
  focusArea: LifeLogFocusArea;
  eventId?: string;
  origin?: "event";
  createdAt: string;
  updatedAt: string;
};

export type StudyTimeRecord = {
  id: string;
  date: string;
  taskId: string;
  minutes: number;
  createdAt: string;
};

export type SharedCalendarState = {
  version: 1;
  schemaVersion: 8;
  categories: Category[];
  events: CalendarEvent[];
  templates: CalendarTemplate[];
  logs: LifeLog[];
  studyRecords: StudyTimeRecord[];
};

export type CalendarDayColumn = {
  day: number;
  weekOffset: number;
  date: Date;
};

export type Draft = {
  date: string;
  endDate?: string;
  day: number;
  weekOffset: number;
  start: number;
  end: number;
  title?: string;
  lifeLogId?: string;
  notificationMinutes?: number | null;
};

export type LifeLogScheduleDuration = 30 | 60 | 90 | 120 | "custom";

export type LifeLogScheduleDetails = {
  date: string;
  end: number;
  endDate: string;
  notificationMinutes: number | null;
  start: number;
};

export type EventEditDraft = {
  eventId: string;
  title: string;
  categoryId: string;
  start: string;
  end: string;
};

export type DropTarget = {
  date: string;
  day: number;
  weekOffset: number;
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
