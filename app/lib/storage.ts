import { DAYS } from "@/app/lib/calendar";
import type {
  CalendarEvent,
  CalendarTemplate,
  Category,
  TemplateEvent,
} from "@/app/types/calendar";

export function isCalendarEvent(value: unknown): value is CalendarEvent {
  if (typeof value !== "object" || value === null) return false;

  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    (event.title === undefined || typeof event.title === "string") &&
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
    (event.title === undefined || typeof event.title === "string") &&
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
