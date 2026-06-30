import {
  CLEANING_CATEGORY,
  DEFAULT_CATEGORIES,
  DAYS,
  attachRoutineRelations,
  mergeUniqueEvents,
} from "@/app/lib/calendar";
import { MINUTES_PER_ROW } from "@/app/lib/time";
import type {
  CalendarEvent,
  CalendarTemplate,
  Category,
  LegacyCalendarEvent,
  TemplateEvent,
} from "@/app/types/calendar";

export const STORAGE_KEY = "project-life-calendar-events";
export const TEMPLATE_STORAGE_KEY = "project-life-calendar-templates";
export const TEMPLATE_STORAGE_VERSION = 1;
export const STORAGE_VERSION = 5;

export function isCalendarEvent(value: unknown): value is CalendarEvent {
  if (typeof value !== "object" || value === null) return false;

  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    typeof event.categoryId === "string" &&
    typeof event.day === "number" &&
    typeof event.start === "number" &&
    typeof event.end === "number" &&
    typeof event.weekOffset === "number" &&
    (event.source === undefined || event.source === "fixed-template") &&
    (event.routineRelation === undefined ||
      event.routineRelation === "after-work-meal" ||
      event.routineRelation === "after-work-bath") &&
    (event.routineDetached === undefined ||
      typeof event.routineDetached === "boolean")
  );
}

export function isLegacyCalendarEvent(
  value: unknown,
): value is LegacyCalendarEvent {
  if (typeof value !== "object" || value === null) return false;

  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    typeof event.title === "string" &&
    typeof event.color === "string" &&
    typeof event.day === "number" &&
    typeof event.start === "number" &&
    typeof event.end === "number" &&
    typeof event.weekOffset === "number" &&
    (event.source === undefined || event.source === "fixed-template")
  );
}

export function isCategory(value: unknown): value is Category {
  if (typeof value !== "object" || value === null) return false;

  const category = value as Record<string, unknown>;
  return (
    typeof category.id === "string" &&
    typeof category.name === "string" &&
    typeof category.color === "string" &&
    typeof category.icon === "string"
  );
}

export function isTemplateEvent(value: unknown): value is TemplateEvent {
  if (typeof value !== "object" || value === null) return false;

  const event = value as Record<string, unknown>;
  return (
    typeof event.categoryId === "string" &&
    typeof event.day === "number" &&
    Number.isInteger(event.day) &&
    event.day >= 0 &&
    event.day < DAYS.length &&
    typeof event.start === "number" &&
    typeof event.end === "number" &&
    event.start >= 0 &&
    event.end <= 24 * 60 &&
    event.start < event.end &&
    (event.routineRelation === undefined ||
      event.routineRelation === "after-work-meal" ||
      event.routineRelation === "after-work-bath")
  );
}

export function isCalendarTemplate(
  value: unknown,
): value is CalendarTemplate {
  if (typeof value !== "object" || value === null) return false;

  const template = value as Record<string, unknown>;
  return (
    typeof template.id === "string" &&
    typeof template.name === "string" &&
    Array.isArray(template.events) &&
    template.events.every(isTemplateEvent) &&
    Array.isArray(template.categories) &&
    template.categories.every(isCategory)
  );
}

export function migrateLegacyEvents(
  legacyEvents: LegacyCalendarEvent[],
  usesThirtyMinuteRows: boolean,
) {
  const categories = DEFAULT_CATEGORIES.map((category) => ({ ...category }));
  const events = legacyEvents.map<CalendarEvent>((event) => {
    let category = categories.find((item) => item.name === event.title);

    if (!category) {
      category = {
        id: `migrated-${crypto.randomUUID()}`,
        name: event.title,
        color: event.color,
        icon: "•",
      };
      categories.push(category);
    }

    return {
      id: event.id,
      categoryId: category.id,
      day: event.day,
      start: usesThirtyMinuteRows
        ? event.start * MINUTES_PER_ROW
        : event.start,
      end: usesThirtyMinuteRows
        ? event.end * MINUTES_PER_ROW
        : event.end,
      weekOffset: event.weekOffset,
      source: event.source,
    };
  });

  return {
    categories,
    events: attachRoutineRelations(mergeUniqueEvents([], events)),
  };
}

export function categoriesWithCleaning(categories: Category[]) {
  return categories.some((category) => category.id === CLEANING_CATEGORY.id)
    ? categories
    : [...categories, { ...CLEANING_CATEGORY }];
}
