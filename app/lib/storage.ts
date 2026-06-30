import { DAYS } from "@/app/lib/calendar";
import type {
  CalendarEvent,
  CalendarTemplate,
  Category,
  EventMode,
  TemplateEvent,
} from "@/app/types/calendar";

export function isEventMode(value: unknown): value is EventMode {
  return value === "fixed" || value === "linked" || value === "flexible";
}

export function normalizeCalendarEvent(
  value: unknown,
): CalendarEvent | null {
  if (typeof value !== "object" || value === null) return null;

  const event = value as Record<string, unknown>;
  const isValid =
    typeof event.id === "string" &&
    (event.title === undefined || typeof event.title === "string") &&
    typeof event.categoryId === "string" &&
    (event.mode === undefined || isEventMode(event.mode)) &&
    typeof event.day === "number" &&
    typeof event.start === "number" &&
    typeof event.end === "number" &&
    typeof event.weekOffset === "number" &&
    (event.source === undefined || event.source === "fixed-template") &&
    (event.routineRelation === undefined ||
      event.routineRelation === "after-work-meal" ||
      event.routineRelation === "after-work-bath") &&
    (event.routineDetached === undefined ||
      typeof event.routineDetached === "boolean");

  if (!isValid) return null;

  return {
    ...(value as Omit<CalendarEvent, "mode">),
    mode: isEventMode(event.mode) ? event.mode : "fixed",
  };
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

export function normalizeTemplateEvent(
  value: unknown,
): TemplateEvent | null {
  if (typeof value !== "object" || value === null) return null;

  const event = value as Record<string, unknown>;
  const isValid =
    typeof event.categoryId === "string" &&
    (event.title === undefined || typeof event.title === "string") &&
    (event.mode === undefined || isEventMode(event.mode)) &&
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
      event.routineRelation === "after-work-bath");

  if (!isValid) return null;

  return {
    ...(value as Omit<TemplateEvent, "mode">),
    mode: isEventMode(event.mode) ? event.mode : "fixed",
  };
}

export function normalizeCalendarTemplate(
  value: unknown,
): CalendarTemplate | null {
  if (typeof value !== "object" || value === null) return null;

  const template = value as Record<string, unknown>;
  if (
    typeof template.id !== "string" ||
    typeof template.name !== "string" ||
    !Array.isArray(template.events) ||
    !Array.isArray(template.categories) ||
    !template.categories.every(isCategory)
  ) {
    return null;
  }

  const events = template.events.map(normalizeTemplateEvent);
  if (events.some((event) => event === null)) return null;

  return {
    id: template.id,
    name: template.name,
    events: events as TemplateEvent[],
    categories: template.categories,
  };
}
