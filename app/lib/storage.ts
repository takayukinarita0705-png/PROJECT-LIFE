import { DAYS } from "@/app/lib/calendar";
import type {
  CalendarEvent,
  CalendarTemplate,
  Category,
  EventLinkType,
  EventMode,
  EventStatus,
  TemplateEvent,
} from "@/app/types/calendar";

export function isEventMode(value: unknown): value is EventMode {
  return value === "fixed" || value === "linked" || value === "flexible";
}

export function isEventStatus(value: unknown): value is EventStatus {
  return (
    value === "pending" ||
    value === "active" ||
    value === "completed" ||
    value === "skipped"
  );
}

export function isEventLinkType(value: unknown): value is EventLinkType {
  return value === "after" || value === "before" || value === "none";
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
    (event.status === undefined || isEventStatus(event.status)) &&
    (event.linkedToEventId === undefined ||
      typeof event.linkedToEventId === "string") &&
    (event.linkType === undefined || isEventLinkType(event.linkType)) &&
    (event.offsetMinutes === undefined ||
      (typeof event.offsetMinutes === "number" &&
        Number.isFinite(event.offsetMinutes))) &&
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
    ...(value as Omit<
      CalendarEvent,
      "mode" | "status" | "linkType" | "offsetMinutes"
    >),
    mode: isEventMode(event.mode) ? event.mode : "fixed",
    status: isEventStatus(event.status) ? event.status : "pending",
    linkType: isEventLinkType(event.linkType) ? event.linkType : "none",
    offsetMinutes:
      typeof event.offsetMinutes === "number" ? event.offsetMinutes : 0,
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
    (template.description !== undefined &&
      typeof template.description !== "string") ||
    (template.createdAt !== undefined &&
      typeof template.createdAt !== "string") ||
    (template.updatedAt !== undefined &&
      typeof template.updatedAt !== "string") ||
    !Array.isArray(template.events) ||
    !Array.isArray(template.categories) ||
    !template.categories.every(isCategory)
  ) {
    return null;
  }

  const events = template.events.map(normalizeTemplateEvent);
  if (events.some((event) => event === null)) return null;
  const normalizedAt = new Date().toISOString();
  const createdAt =
    typeof template.createdAt === "string"
      ? template.createdAt
      : normalizedAt;

  return {
    id: template.id,
    name: template.name,
    description:
      typeof template.description === "string" ? template.description : "",
    events: events as TemplateEvent[],
    categories: template.categories,
    createdAt,
    updatedAt:
      typeof template.updatedAt === "string"
        ? template.updatedAt
        : createdAt,
  };
}
