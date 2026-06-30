import { describe, expect, it } from "vitest";
import {
  attachRoutineRelations,
  mergeUniqueEvents,
  updateRoutineManually,
  updateWorkWithRelatedRoutine,
} from "@/app/lib/calendar";
import type { CalendarEvent } from "@/app/types/calendar";

function createEvent(
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: "event",
    categoryId: "work",
    mode: "fixed",
    status: "pending",
    linkType: "none",
    offsetMinutes: 0,
    day: 0,
    start: 9 * 60,
    end: 19 * 60,
    weekOffset: 0,
    ...overrides,
  };
}

describe("テンプレート重複防止", () => {
  it("同じ週・曜日・時間・カテゴリの予定を重複追加しない", () => {
    const current = createEvent({ id: "current" });
    const duplicate = createEvent({ id: "duplicate" });
    const unique = createEvent({
      id: "unique",
      categoryId: "meal",
      start: 19 * 60 + 30,
      end: 19 * 60 + 45,
    });

    expect(mergeUniqueEvents([current], [duplicate, unique])).toEqual([
      current,
      unique,
    ]);
  });

  it("追加候補同士の重複も一件だけ残す", () => {
    const first = createEvent({ id: "first" });
    const second = createEvent({ id: "second" });

    expect(mergeUniqueEvents([], [first, second])).toEqual([first]);
  });
});

describe("仕事→ご飯→お風呂のRoutine処理", () => {
  const work = createEvent({ id: "work" });
  const meal = createEvent({
    id: "meal",
    categoryId: "meal",
    start: 19 * 60 + 30,
    end: 19 * 60 + 45,
  });
  const bath = createEvent({
    id: "bath",
    categoryId: "bath",
    start: 19 * 60 + 45,
    end: 20 * 60 + 10,
  });

  it("時刻関係からご飯とお風呂をRoutineとして関連付ける", () => {
    const related = attachRoutineRelations([work, meal, bath]);

    expect(related.find((event) => event.id === "meal")?.routineRelation).toBe(
      "after-work-meal",
    );
    expect(related.find((event) => event.id === "bath")?.routineRelation).toBe(
      "after-work-bath",
    );
  });

  it("仕事終了時刻に合わせてご飯とお風呂を移動する", () => {
    const related = attachRoutineRelations([work, meal, bath]);
    const editedWork = { ...work, end: 20 * 60 };
    const updated = updateWorkWithRelatedRoutine(
      related,
      work,
      editedWork,
    );

    expect(updated.find((event) => event.id === "meal")).toMatchObject({
      start: 20 * 60 + 30,
      end: 20 * 60 + 45,
    });
    expect(updated.find((event) => event.id === "bath")).toMatchObject({
      start: 20 * 60 + 45,
      end: 21 * 60 + 10,
    });
  });

  it("Routineを手動変更すると同日の仕事を自動調整対象外にする", () => {
    const related = attachRoutineRelations([work, meal, bath]);
    const originalMeal = related.find((event) => event.id === "meal");
    expect(originalMeal).toBeDefined();

    const updated = updateRoutineManually(
      related,
      originalMeal!,
      { ...originalMeal!, start: 21 * 60, end: 21 * 60 + 15 },
    );

    expect(updated.find((event) => event.id === "work")?.routineDetached).toBe(
      true,
    );
  });
});
