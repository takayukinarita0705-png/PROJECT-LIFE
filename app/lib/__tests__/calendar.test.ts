import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATEGORIES,
  FREE_CATEGORY,
  FREE_CATEGORY_ID,
  attachRoutineRelations,
  ensureFreeCategory,
  filterEventsByDate,
  filterEventsByDates,
  mergeUniqueEvents,
  normalizeNewEventTitle,
  resetEventStatus,
  toggleEventCompletion,
  toggleEventSkipped,
  updateRoutineManually,
} from "@/app/lib/calendar";
import { runRoutineEngine } from "@/app/lib/engine/routineEngine";
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
    date: "2026-06-29",
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
    const duplicate = createEvent({
      id: "duplicate",
      day: 6,
      weekOffset: 99,
    });
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

describe("フリー予定", () => {
  it("中立色とメモアイコンのフリーカテゴリを提供する", () => {
    expect(FREE_CATEGORY).toMatchObject({
      id: FREE_CATEGORY_ID,
      name: "フリー",
      color: "#64748b",
      icon: "📝",
      group: "other",
    });
    expect(
      DEFAULT_CATEGORIES.some(
        (category) => category.id === FREE_CATEGORY_ID,
      ),
    ).toBe(true);
  });

  it("既存カテゴリへフリーを一度だけ補完する", () => {
    const existing = DEFAULT_CATEGORIES.filter(
      (category) => category.id !== FREE_CATEGORY_ID,
    );
    const withFree = ensureFreeCategory(existing);

    expect(
      withFree.filter((category) => category.id === FREE_CATEGORY_ID),
    ).toHaveLength(1);
    expect(ensureFreeCategory(withFree)).toBe(withFree);
  });

  it("フリーだけ自由入力名を保存対象にする", () => {
    expect(normalizeNewEventTitle(FREE_CATEGORY_ID, "  通院  ")).toBe(
      "通院",
    );
    expect(normalizeNewEventTitle(FREE_CATEGORY_ID, "  ")).toBeNull();
    expect(normalizeNewEventTitle("work", "自由入力")).toBeUndefined();
  });
});

describe("date中心のEvent抽出", () => {
  const referenceDate = new Date(2026, 6, 1, 12);
  const datedEvent = createEvent({
    id: "dated",
    date: "2026-08-15",
    day: 0,
    weekOffset: 0,
  });
  const legacyEvent = createEvent({
    id: "legacy",
    date: undefined,
    day: 2,
    weekOffset: 1,
  });

  it("dateがあるEventはweekOffset/dayよりdateを優先する", () => {
    expect(
      filterEventsByDate(
        [datedEvent],
        "2026-08-15",
        referenceDate,
      ),
    ).toEqual([datedEvent]);
    expect(
      filterEventsByDate(
        [datedEvent],
        "2026-06-29",
        referenceDate,
      ),
    ).toEqual([]);
  });

  it("dateがないEventだけweekOffset/dayで補完する", () => {
    expect(
      filterEventsByDate(
        [legacyEvent],
        "2026-07-08",
        referenceDate,
      ),
    ).toEqual([legacyEvent]);
  });

  it("表示対象の日付集合が変わると該当Eventだけを抽出する", () => {
    const events = [datedEvent, legacyEvent];

    expect(
      filterEventsByDates(
        events,
        ["2026-07-06", "2026-07-07", "2026-07-08"],
        referenceDate,
      ),
    ).toEqual([legacyEvent]);
    expect(
      filterEventsByDates(events, ["2026-08-15"], referenceDate),
    ).toEqual([datedEvent]);
  });
});

describe("Event完了状態", () => {
  it("対象Eventをpendingとcompletedの間で切り替える", () => {
    const pending = createEvent({ id: "target", status: "pending" });
    const other = createEvent({ id: "other", status: "pending" });

    const completed = toggleEventCompletion([pending, other], "target");
    expect(completed).toEqual([
      { ...pending, status: "completed" },
      other,
    ]);
    expect(toggleEventCompletion(completed, "target")).toEqual([
      pending,
      other,
    ]);
  });

  it("対象Eventをpendingとskippedの間で切り替える", () => {
    const pending = createEvent({ id: "target", status: "pending" });

    const skipped = toggleEventSkipped([pending], "target");
    expect(skipped).toEqual([{ ...pending, status: "skipped" }]);
    expect(toggleEventSkipped(skipped, "target")).toEqual([pending]);
  });

  it("completedとskippedをpendingへ戻す", () => {
    const completed = createEvent({
      id: "completed",
      status: "completed",
    });
    const skipped = createEvent({ id: "skipped", status: "skipped" });

    expect(resetEventStatus([completed, skipped], "completed")).toEqual([
      { ...completed, status: "pending" },
      skipped,
    ]);
    expect(resetEventStatus([completed, skipped], "skipped")).toEqual([
      completed,
      { ...skipped, status: "pending" },
    ]);
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
    expect(related.find((event) => event.id === "meal")).toMatchObject({
      mode: "linked",
      linkedToEventId: "work",
      linkType: "after",
      offsetMinutes: 30,
    });
    expect(related.find((event) => event.id === "bath")?.routineRelation).toBe(
      "after-work-bath",
    );
    expect(related.find((event) => event.id === "bath")).toMatchObject({
      mode: "linked",
      linkedToEventId: "meal",
      linkType: "after",
      offsetMinutes: 0,
    });
  });

  it("仕事終了時刻に合わせてご飯とお風呂を移動する", () => {
    const related = attachRoutineRelations([work, meal, bath]);
    const editedWork = {
      ...work,
      date: "2026-07-08",
      day: 2,
      weekOffset: 1,
      end: 20 * 60,
    };
    const updated = runRoutineEngine(related, work, editedWork);

    expect(updated.find((event) => event.id === "meal")).toMatchObject({
      date: "2026-07-08",
      day: 2,
      weekOffset: 1,
      start: 20 * 60 + 30,
      end: 20 * 60 + 45,
    });
    expect(updated.find((event) => event.id === "bath")).toMatchObject({
      date: "2026-07-08",
      day: 2,
      weekOffset: 1,
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

    const detachedWork = updated.find((event) => event.id === "work");
    expect(detachedWork).toBeDefined();
    const moved = runRoutineEngine(
      updated,
      detachedWork!,
      { ...detachedWork!, end: 20 * 60 },
    );
    expect(moved.find((event) => event.id === "meal")).toMatchObject({
      start: 21 * 60,
      end: 21 * 60 + 15,
    });
  });

  it("fixed以外の仕事ではリンク予定を再計算しない", () => {
    const related = attachRoutineRelations([work, meal, bath]);
    const linkedWork = { ...work, mode: "linked" as const };
    const updated = runRoutineEngine(related, linkedWork, {
      ...linkedWork,
      end: 20 * 60,
    });

    expect(updated.find((event) => event.id === "meal")).toMatchObject({
      start: 19 * 60 + 30,
      end: 19 * 60 + 45,
    });
  });
});
