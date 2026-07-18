import { describe, expect, it } from "vitest";
import {
  getStudyTimeSummary,
  isStudyCategory,
} from "@/app/lib/studyTime";
import type { CalendarEvent, Category } from "@/app/types/calendar";

const studyCategory: Category = {
  id: "takken-law",
  name: "宅建業法",
  color: "#ef4444",
  icon: "📕",
  group: "study",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const workCategory: Category = {
  ...studyCategory,
  id: "work",
  name: "仕事",
  group: "work",
};

function createEvent(
  id: string,
  date: string,
  minutes: number,
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id,
    categoryId: studyCategory.id,
    mode: "fixed",
    status: "completed",
    linkType: "none",
    offsetMinutes: 0,
    date,
    day: 0,
    start: 9 * 60,
    end: 9 * 60 + minutes,
    weekOffset: 0,
    notificationMinutes: null,
    ...overrides,
  };
}

describe("Study Time集計", () => {
  it("studyグループと宅建・勉強・学習カテゴリを勉強系として扱う", () => {
    expect(isStudyCategory(studyCategory)).toBe(true);
    expect(
      isStudyCategory({ ...workCategory, name: "資格の勉強" }),
    ).toBe(true);
    expect(
      isStudyCategory({ ...workCategory, name: "英語学習" }),
    ).toBe(true);
    expect(isStudyCategory(workCategory)).toBe(false);
  });

  it("完了予定の開始・終了時刻から今日・今週・日別・継続日数を集計する", () => {
    const events = [
      createEvent("sun", "2026-07-12", 10),
      createEvent("mon", "2026-07-13", 10),
      createEvent("tue", "2026-07-14", 90),
      createEvent("wed", "2026-07-15", 60),
      createEvent("thu", "2026-07-16", 25),
      createEvent("fri", "2026-07-17", 120),
      createEvent("sat", "2026-07-18", 85),
      createEvent("pending", "2026-07-18", 300, { status: "pending" }),
      createEvent("work", "2026-07-18", 600, {
        categoryId: workCategory.id,
      }),
    ];

    expect(
      getStudyTimeSummary(
        events,
        [studyCategory, workCategory],
        new Date(2026, 6, 18, 12),
      ),
    ).toMatchObject({
      todayMinutes: 85,
      weekMinutes: 380,
      streakDays: 7,
      nextStreakDays: 7,
      studiedToday: true,
      progressPercentage: 71,
      days: [
        { date: "2026-07-14", label: "火", minutes: 90 },
        { date: "2026-07-15", label: "水", minutes: 60 },
        { date: "2026-07-16", label: "木", minutes: 25 },
        { date: "2026-07-17", label: "金", minutes: 120 },
        { date: "2026-07-18", label: "土", minutes: 85 },
        { date: "2026-07-19", label: "日", minutes: 0 },
        { date: "2026-07-20", label: "月", minutes: 0 },
      ],
    });
  });

  it("今日が未記録なら昨日までの継続日数と今日達成時の日数を返す", () => {
    const summary = getStudyTimeSummary(
      [
        createEvent("yesterday", "2026-07-17", 60),
        createEvent("two-days-ago", "2026-07-16", 60),
      ],
      [studyCategory],
      new Date(2026, 6, 18, 12),
    );

    expect(summary).toMatchObject({
      todayMinutes: 0,
      streakDays: 2,
      nextStreakDays: 3,
      studiedToday: false,
    });
  });
});
