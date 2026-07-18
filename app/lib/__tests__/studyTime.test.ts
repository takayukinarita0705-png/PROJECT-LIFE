import { describe, expect, it } from "vitest";
import {
  createStudyTimeRecord,
  getDailyStudyMinutes,
  getJapanStudyDate,
  getMonthStudyMinutes,
  getStudyStreak,
  getStudyTimeSummary,
  getTodayStudyMinutes,
  getTotalStudyMinutes,
  getWeekStudyMinutes,
  isStudyTask,
  isTakkenTask,
  mergeStudyTimeRecords,
  normalizeStudyTimeRecord,
  removeCompletionStudyTimeRecords,
  resolveStudyDuration,
  upsertStudyTimeRecord,
} from "@/app/lib/studyTime";
import type {
  CalendarEvent,
  Category,
  StudyTimeRecord,
  StudyTimeSource,
} from "@/app/types/calendar";

const categoryBase: Category = {
  id: "takken-law",
  name: "宅建業法",
  color: "#ef4444",
  icon: "📕",
  group: "study",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function createTask(
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: "task-1",
    categoryId: "takken-law",
    mode: "fixed",
    status: "pending",
    linkType: "none",
    offsetMinutes: 0,
    date: "2026-07-18",
    day: 4,
    start: 540,
    end: 625,
    weekOffset: 0,
    notificationMinutes: null,
    ...overrides,
  };
}

function createRecord(
  id: string,
  studyDate: string,
  minutes: number,
  source: StudyTimeSource = "scheduled_duration",
  taskId = `${id}-task`,
): StudyTimeRecord {
  return {
    id,
    taskId,
    studyDate,
    minutes,
    source,
    createdAt: `${studyDate}T01:00:00.000Z`,
    updatedAt: `${studyDate}T01:00:00.000Z`,
  };
}

describe("勉強タスク判定", () => {
  it("構造化された宅建カテゴリと既存宅建ルーティンを優先判定する", () => {
    expect(isTakkenTask(createTask(), categoryBase)).toBe(true);
    expect(
      isTakkenTask(
        createTask({ categoryId: "other", routineId: "takken-morning" }),
        { ...categoryBase, id: "other", name: "資格", group: "life" },
      ),
    ).toBe(true);
  });

  it("一般の勉強カテゴリ・studyタグを判定する", () => {
    const general = { ...categoryBase, id: "general", name: "英語", group: "study" };
    expect(isStudyTask(createTask({ categoryId: general.id }), general)).toBe(true);
    expect(
      isStudyTask(
        createTask({ categoryId: "other", tags: ["study"] }),
        { ...general, id: "other", group: "life" },
      ),
    ).toBe(true);
  });

  it("旧データは宅建関連語を補助判定し、仕事・食事は対象外にする", () => {
    const other = { ...categoryBase, id: "other", name: "その他", group: "life" };
    expect(isTakkenTask(createTask({ categoryId: "other", title: "民法 過去問" }), other)).toBe(true);
    expect(isStudyTask(createTask({ categoryId: "work", title: "仕事" }), { ...other, id: "work", name: "仕事" })).toBe(false);
    expect(isStudyTask(createTask({ categoryId: "lunch", title: "昼ご飯" }), { ...other, id: "lunch", name: "昼ご飯" })).toBe(false);
  });
});

describe("完了時の勉強時間決定", () => {
  it("実測、入力、予定時間、所要時間の優先順位で決定する", () => {
    expect(resolveStudyDuration(createTask({ actualStudyMinutes: 50 }), 30)).toEqual({ minutes: 50, source: "timer", studyDate: undefined });
    expect(resolveStudyDuration(createTask(), 45)).toEqual({ minutes: 45, source: "task_completion" });
    expect(resolveStudyDuration(createTask())).toEqual({ minutes: 85, source: "scheduled_duration" });
    expect(resolveStudyDuration(createTask({ start: 600, end: 600, durationMinutes: 30 }))).toEqual({ minutes: 30, source: "scheduled_duration" });
  });

  it("日付またぎを明示した正の時間は計算し、逆転・過大時間は入力へフォールバックする", () => {
    expect(resolveStudyDuration(createTask({ start: 23 * 60, end: 25 * 60 }))).toMatchObject({ minutes: 120 });
    expect(resolveStudyDuration(createTask({ start: 23 * 60, end: 60 }))).toBeNull();
    expect(resolveStudyDuration(createTask({ start: 0, end: 1441 }))).toBeNull();
  });
});

describe("Study Time保存と集計", () => {
  it("保存レコードを検証し、同一タスク・sourceはupsertして二重登録しない", () => {
    const first = createRecord("first", "2026-07-18", 30, "task_completion", "task-1");
    const updated = createRecord("updated", "2026-07-18", 45, "scheduled_duration", "task-1");
    expect(normalizeStudyTimeRecord(first)).toEqual(first);
    expect(upsertStudyTimeRecord([first], updated)).toEqual([updated]);
    expect(normalizeStudyTimeRecord({ ...first, minutes: 0 })).toBeNull();
    expect(
      createStudyTimeRecord({
        id: "record-1",
        taskId: "task-1",
        studyDate: "2026-07-18",
        minutes: 45,
        source: "task_completion",
        createdAt: "2026-07-18T01:00:00.000Z",
      }),
    ).toMatchObject({ updatedAt: "2026-07-18T01:00:00.000Z" });
  });

  it("完了取り消しでは自動記録だけ削除し、manualとtimerは保持する", () => {
    const records = [
      createRecord("completion", "2026-07-18", 30, "task_completion", "task-1"),
      createRecord("scheduled", "2026-07-18", 30, "scheduled_duration", "task-1"),
      createRecord("manual", "2026-07-18", 10, "manual", "task-1"),
      createRecord("timer", "2026-07-18", 20, "timer", "task-1"),
    ];
    expect(removeCompletionStudyTimeRecords(records, "task-1")).toEqual(records.slice(2));
  });

  it("火曜日始まりで今日・週・月・累計・日別・連続日数を集計する", () => {
    const records = [
      createRecord("mon", "2026-07-13", 10),
      createRecord("tue", "2026-07-14", 90),
      createRecord("wed", "2026-07-15", 60),
      createRecord("thu", "2026-07-16", 25),
      createRecord("fri", "2026-07-17", 120),
      createRecord("sat", "2026-07-18", 85),
    ];
    const referenceDate = new Date("2026-07-18T03:00:00.000Z");
    expect(getTodayStudyMinutes(records, referenceDate)).toBe(85);
    expect(getDailyStudyMinutes(records, "2026-07-15")).toBe(60);
    expect(getWeekStudyMinutes(records, referenceDate)).toBe(380);
    expect(getMonthStudyMinutes(records, referenceDate)).toBe(390);
    expect(getTotalStudyMinutes(records)).toBe(390);
    expect(getStudyStreak(records, referenceDate)).toBe(6);
    expect(getStudyTimeSummary(records, referenceDate)).toMatchObject({ todayMinutes: 85, weekMinutes: 380, streakDays: 6 });
  });

  it("日本時間の日付境界をUTC時刻から正しく求め、タイマーの日付を優先する", () => {
    expect(getJapanStudyDate(new Date("2026-07-17T15:30:00.000Z"))).toBe("2026-07-18");
    expect(resolveStudyDuration(createTask({ actualStudyMinutes: 40, timerStudyDate: "2026-07-17" }))).toEqual({ minutes: 40, source: "timer", studyDate: "2026-07-17" });
  });

  it("端末間の自動記録を重複なく統合し、ローカル取り消しを復活させない", () => {
    const local = createRecord("local", "2026-07-18", 45, "scheduled_duration", "task-1");
    const remoteDuplicate = createRecord("remote", "2026-07-18", 60, "scheduled_duration", "task-1");
    expect(mergeStudyTimeRecords([local], [remoteDuplicate], new Set())).toEqual([local]);
    expect(mergeStudyTimeRecords([], [remoteDuplicate], new Set(["task-1"]))).toEqual([]);
  });
});
