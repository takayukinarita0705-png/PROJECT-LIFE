import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATEGORIES,
  FREE_CATEGORY,
  FREE_CATEGORY_ID,
  WORKDAY_ROUTINE,
  attachRoutineRelations,
  canQuickPostponeEvent,
  createFixedTemplateEvents,
  ensureFreeCategory,
  filterEventsByDate,
  filterEventsByDates,
  isCarryoverEligibleEvent,
  mergeUniqueEvents,
  moveEventToNextDay,
  normalizeNewEventTitle,
  preserveRemoteEventStatuses,
  postponeEventToDate,
  reconcileTemplateEvents,
  resetEventStatus,
  toggleEventCompletion,
  toggleEventSkipped,
} from "@/app/lib/calendar";
import {
  detachEventFromRoutine,
  isRoutineLinkedEvent,
  runRoutineEngine,
} from "@/app/lib/engine/routineEngine";
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
    notificationMinutes: null,
    date: "2026-06-29",
    day: 0,
    start: 9 * 60,
    end: 19 * 60,
    weekOffset: 0,
    ...overrides,
  };
}

describe("予定のクイック延期", () => {
  const referenceDate = new Date(2026, 6, 14, 12);

  it("明日へ延期する", () => {
    const postponed = postponeEventToDate(
      createEvent({ date: "2026-07-14", day: 0 }),
      "2026-07-15",
      referenceDate,
    );

    expect(postponed).toMatchObject({
      date: "2026-07-15",
      day: 1,
      weekOffset: 0,
    });
  });

  it("来週へ延期する", () => {
    const postponed = postponeEventToDate(
      createEvent({ date: "2026-07-14", day: 0 }),
      "2026-07-21",
      referenceDate,
    );

    expect(postponed).toMatchObject({
      date: "2026-07-21",
      day: 0,
      weekOffset: 1,
    });
  });

  it("延期後も開始・終了時刻と日付またぎの時間を維持する", () => {
    const postponed = postponeEventToDate(
      createEvent({
        date: "2026-07-14",
        start: 23 * 60 + 30,
        end: 24 * 60 + 30,
        endDate: "2026-07-15",
      }),
      "2026-07-17",
      referenceDate,
    );

    expect(postponed).toMatchObject({
      date: "2026-07-17",
      start: 23 * 60 + 30,
      end: 24 * 60 + 30,
      endDate: "2026-07-18",
    });
  });

  it("通知設定とライフログ紐付けを維持する", () => {
    const postponed = postponeEventToDate(
      createEvent({
        date: "2026-07-14",
        lifeLogId: "log-1",
        notificationMinutes: 30,
        notificationSentAt: "2026-07-14T00:00:00.000Z",
      }),
      "2026-07-17",
      referenceDate,
    );

    expect(postponed.lifeLogId).toBe("log-1");
    expect(postponed.notificationMinutes).toBe(30);
    expect(postponed.notificationSentAt).toBeUndefined();
  });

  it.each(["completed", "skipped"] as const)(
    "%s予定は延期できない",
    (status) => {
      const original = createEvent({ status, date: "2026-07-14" });

      expect(canQuickPostponeEvent(original)).toBe(false);
      expect(
        postponeEventToDate(
          original,
          "2026-07-15",
          referenceDate,
        ),
      ).toBe(original);
    },
  );
});

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

describe("週間固定テンプレート", () => {
  const events = createFixedTemplateEvents(0).filter(
    (event) => event.day === 0,
  );

  it("毎朝の起床と5:10開始の散歩を作成する", () => {
    expect(events.find((event) => event.categoryId === "wake")).toMatchObject({
      start: 5 * 60,
      end: 5 * 60 + 10,
    });
    expect(events.find((event) => event.categoryId === "walk")).toMatchObject({
      start: 5 * 60 + 10,
      end: 5 * 60 + 30,
    });
  });

  it("宅建学習ブロックの間を5分空ける", () => {
    const studyEvents = ["takken-law", "rights", "regulations"].map(
      (categoryId) =>
        events.find((event) => event.categoryId === categoryId)!,
    );

    expect(studyEvents[1].start - studyEvents[0].end).toBe(5);
    expect(studyEvents[2].start - studyEvents[1].end).toBe(5);
  });

  it("22時開始の睡眠を残す", () => {
    expect(
      events.find(
        (event) =>
          event.categoryId === "sleep" && event.start === 22 * 60,
      ),
    ).toMatchObject({
      start: 22 * 60,
      end: 24 * 60,
    });
  });

  it("火曜始まりの実曜日で休日を設定する", () => {
    const tuesdayOff = createFixedTemplateEvents(0);
    const thursdayOff = createFixedTemplateEvents(2);
    const workDays = (events: typeof tuesdayOff) =>
      events
        .filter((event) => event.categoryId === "work")
        .map((event) => event.day);

    expect(workDays(tuesdayOff)).not.toContain(0);
    expect(workDays(tuesdayOff)).not.toContain(1);
    expect(workDays(thursdayOff)).not.toContain(1);
    expect(workDays(thursdayOff)).not.toContain(2);
  });
});

describe("テンプレート再適用", () => {
  it("同一予定のstatusと関連情報を維持する", () => {
    const existing = createEvent({
      id: "existing",
      status: "completed",
      mode: "linked",
      linkedToEventId: "parent",
      linkType: "after",
      offsetMinutes: 30,
      source: "fixed-template",
    });
    const generated = createEvent({
      id: "generated",
      status: "pending",
      source: "fixed-template",
    });

    expect(reconcileTemplateEvents([existing], [generated])).toEqual([
      existing,
    ]);
  });

  it("新規予定だけをpendingの生成Eventとして追加する", () => {
    const generated = createEvent({
      id: "generated",
      categoryId: "meal",
      status: "pending",
      source: "fixed-template",
    });

    expect(reconcileTemplateEvents([], [generated])).toEqual([generated]);
  });

  it("既存親Eventを再利用した場合は新規子Eventのリンク先IDを合わせる", () => {
    const existingParent = createEvent({ id: "existing-parent" });
    const generatedParent = createEvent({ id: "generated-parent" });
    const generatedChild = createEvent({
      id: "generated-child",
      categoryId: "meal",
      linkedToEventId: generatedParent.id,
      linkType: "after",
    });

    expect(
      reconcileTemplateEvents(
        [existingParent],
        [generatedParent, generatedChild],
      )[1].linkedToEventId,
    ).toBe(existingParent.id);
  });
});

describe("端末間のEvent status同期", () => {
  it("PCで未変更のstatusはSupabase最新値を維持する", () => {
    const local = createEvent({ status: "pending" });
    const remote = createEvent({ status: "completed" });

    expect(
      preserveRemoteEventStatuses([local], [remote], new Set()),
    ).toEqual([{ ...local, status: "completed" }]);
  });

  it("この端末で明示変更したstatusはローカル値を維持する", () => {
    const local = createEvent({ status: "pending" });
    const remote = createEvent({ status: "skipped" });

    expect(
      preserveRemoteEventStatuses(
        [local],
        [remote],
        new Set([local.id]),
      ),
    ).toEqual([local]);
  });
});

describe("フリー予定", () => {
  it("睡眠と区別できる色とメモアイコンを提供する", () => {
    expect(FREE_CATEGORY).toMatchObject({
      id: FREE_CATEGORY_ID,
      name: "フリー",
      color: "#F59E0B",
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

  it("保存済みフリーカテゴリの旧色だけを新しいデザインへ更新する", () => {
    const work = DEFAULT_CATEGORIES.find(
      (category) => category.id === "work",
    )!;
    const legacyFree = {
      ...FREE_CATEGORY,
      color: "#64748b",
    };
    const updated = ensureFreeCategory([work, legacyFree]);

    expect(updated.find((category) => category.id === FREE_CATEGORY_ID))
      .toMatchObject({
        color: "#F59E0B",
        icon: "📝",
      });
    expect(updated.find((category) => category.id === "work")).toBe(work);
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
        "2026-07-09",
        referenceDate,
      ),
    ).toEqual([legacyEvent]);
  });

  it("表示対象の日付集合が変わると該当Eventだけを抽出する", () => {
    const events = [datedEvent, legacyEvent];

    expect(
      filterEventsByDates(
        events,
        ["2026-07-07", "2026-07-08", "2026-07-09"],
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

  it("フリー予定は翌日の同じ時間へpendingで繰り越す", () => {
    const skippedFree = createEvent({
      id: "free",
      categoryId: FREE_CATEGORY_ID,
      status: "skipped",
      date: "2026-07-01",
      day: 1,
      weekOffset: 0,
      start: 10 * 60,
      end: 11 * 60,
    });

    expect(isCarryoverEligibleEvent(skippedFree)).toBe(true);
    expect(
      moveEventToNextDay(
        [skippedFree],
        skippedFree.id,
        new Date(2026, 6, 1, 12),
      ),
    ).toEqual([
      {
        ...skippedFree,
        date: "2026-07-02",
        day: 2,
        weekOffset: 0,
        status: "pending",
      },
    ]);
  });

  it("Future Engineから予定化した予定はlifeLogIdで繰り越し対象にする", () => {
    const scheduledFromLog = createEvent({
      id: "future-event",
      categoryId: "reading",
      lifeLogId: "log-1",
      status: "skipped",
      date: "2026-07-06",
      day: 6,
      weekOffset: -1,
    });

    expect(isCarryoverEligibleEvent(scheduledFromLog)).toBe(true);
    expect(
      moveEventToNextDay(
        [scheduledFromLog],
        scheduledFromLog.id,
        new Date(2026, 6, 1, 12),
      )[0],
    ).toMatchObject({
      date: "2026-07-07",
      day: 0,
      weekOffset: 1,
      status: "pending",
      lifeLogId: "log-1",
    });
  });

  it("仕事など対象外の予定は繰り越さない", () => {
    const skippedWork = createEvent({
      id: "work",
      status: "skipped",
      date: "2026-07-01",
    });

    expect(isCarryoverEligibleEvent(skippedWork)).toBe(false);
    expect(moveEventToNextDay([skippedWork], skippedWork.id)).toEqual([
      skippedWork,
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

  it("リンク予定を固定予定としてルーティンから切り離す", () => {
    const related = attachRoutineRelations([work, meal, bath]);
    const linkedMeal = related.find((event) => event.id === "meal")!;
    const detachedMeal = detachEventFromRoutine(linkedMeal);

    expect(isRoutineLinkedEvent(linkedMeal)).toBe(true);
    expect(detachedMeal).toMatchObject({
      mode: "fixed",
      linkType: "none",
      offsetMinutes: 0,
    });
    expect(detachedMeal.linkedToEventId).toBeUndefined();
    expect(isRoutineLinkedEvent(detachedMeal)).toBe(false);
    expect(linkedMeal.linkedToEventId).toBe("work");
  });

  it("解除後は親イベントを変更しても再配置しない", () => {
    const related = attachRoutineRelations([work, meal, bath]);
    const detached = related.map((event) =>
      event.id === "meal"
        ? detachEventFromRoutine({
            ...event,
            start: 21 * 60,
            end: 21 * 60 + 15,
          })
        : event,
    );
    const updated = runRoutineEngine(detached, {
      ...work,
      end: 20 * 60,
    });

    expect(updated.find((event) => event.id === "meal")).toMatchObject({
      start: 21 * 60,
      end: 21 * 60 + 15,
      mode: "fixed",
      linkType: "none",
      offsetMinutes: 0,
    });
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
    const related = attachRoutineRelations([
      work,
      { ...meal, status: "completed" },
      { ...bath, status: "skipped" },
    ]);
    const editedWork = {
      ...work,
      date: "2026-07-08",
      day: 2,
      weekOffset: 1,
      end: 20 * 60,
    };
    const updated = runRoutineEngine(related, editedWork);

    expect(updated.find((event) => event.id === "meal")).toMatchObject({
      date: "2026-07-08",
      day: 2,
      weekOffset: 1,
      status: "completed",
      start: 20 * 60 + 30,
      end: 20 * 60 + 45,
    });
    expect(
      updated.find((event) => event.id === "meal")!.start -
        editedWork.end,
    ).toBe(WORKDAY_ROUTINE.mealDelayMinutes);
    expect(updated.find((event) => event.id === "bath")).toMatchObject({
      date: "2026-07-08",
      day: 2,
      weekOffset: 1,
      status: "skipped",
      start: 20 * 60 + 45,
      end: 21 * 60 + 10,
    });
  });

  it("別日のご飯とお風呂は仕事日のRoutineへ関連付けない", () => {
    const nextDayMeal = {
      ...meal,
      id: "next-day-meal",
      date: "2026-06-30",
      day: 1,
    };
    const nextDayBath = {
      ...bath,
      id: "next-day-bath",
      date: "2026-06-30",
      day: 1,
    };
    const related = attachRoutineRelations([
      work,
      nextDayMeal,
      nextDayBath,
    ]);

    expect(
      related.find((event) => event.id === "next-day-meal")?.linkedToEventId,
    ).toBeUndefined();
    expect(
      related.find((event) => event.id === "next-day-bath")?.linkedToEventId,
    ).toBeUndefined();
  });

  it("仕事以外の予定変更ではRoutineを再配置しない", () => {
    const related = attachRoutineRelations([work, meal, bath]);
    const freeEvent = createEvent({
      id: "free",
      categoryId: "free",
      start: 18 * 60,
      end: 19 * 60,
    });
    const updated = runRoutineEngine(
      [...related, freeEvent],
      { ...freeEvent, end: 20 * 60 },
    );

    expect(updated.find((event) => event.id === "meal")).toMatchObject({
      start: 19 * 60 + 30,
      end: 19 * 60 + 45,
    });
    expect(updated.find((event) => event.id === "bath")).toMatchObject({
      start: 19 * 60 + 45,
      end: 20 * 60 + 10,
    });
  });

  it("子の変更を孫へ連鎖する", () => {
    const related = attachRoutineRelations([work, meal, bath]);
    const originalMeal = related.find((event) => event.id === "meal");
    expect(originalMeal).toBeDefined();

    const updated = runRoutineEngine(
      related,
      { ...originalMeal!, start: 21 * 60, end: 21 * 60 + 15 },
    );

    expect(updated.find((event) => event.id === "meal")).toMatchObject({
      start: 21 * 60,
      end: 21 * 60 + 15,
    });
    expect(updated.find((event) => event.id === "bath")).toMatchObject({
      start: 21 * 60 + 15,
      end: 21 * 60 + 40,
    });
  });

  it("カテゴリやmodeに依存せず親IDから子を再計算する", () => {
    const related = attachRoutineRelations([work, meal, bath]);
    const updated = runRoutineEngine(related, {
      ...work,
      categoryId: "free",
      mode: "flexible" as const,
      end: 20 * 60,
    });

    expect(updated.find((event) => event.id === "meal")).toMatchObject({
      start: 20 * 60 + 30,
      end: 20 * 60 + 45,
    });
    expect(updated.find((event) => event.id === "bath")).toMatchObject({
      start: 20 * 60 + 45,
      end: 21 * 60 + 10,
    });
  });

  it("beforeリンクは親の開始時刻より前へ再配置する", () => {
    const parent = createEvent({
      id: "parent",
      categoryId: "free",
      start: 12 * 60,
      end: 13 * 60,
    });
    const child = createEvent({
      id: "child",
      categoryId: "walk",
      mode: "linked",
      linkedToEventId: parent.id,
      linkType: "before",
      offsetMinutes: 15,
      start: 11 * 60,
      end: 11 * 60 + 30,
    });
    const updated = runRoutineEngine([parent, child], {
      ...parent,
      start: 14 * 60,
      end: 15 * 60,
    });

    expect(updated.find((event) => event.id === "child")).toMatchObject({
      start: 13 * 60 + 15,
      end: 13 * 60 + 45,
    });
  });
});
