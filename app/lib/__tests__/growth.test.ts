import { describe, expect, it } from "vitest";
import {
  getGrowthDashboard,
  getLongestStudyStreak,
} from "@/app/lib/growth";
import type {
  CalendarEvent,
  Category,
  LifeLog,
  StudyTimeRecord,
} from "@/app/types/calendar";

const categories: Category[] = [
  {
    id: "takken-law",
    name: "宅建業法",
    color: "#ef4444",
    icon: "📚",
    group: "study",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "walk",
    name: "散歩",
    color: "#10b981",
    icon: "🚶",
    group: "life",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function createEvent(
  id: string,
  categoryId: string,
  status: CalendarEvent["status"],
  completedAt?: string,
  source?: "fixed-template",
): CalendarEvent {
  return {
    id,
    title: categoryId === "walk" ? "夕方の散歩" : "宅建業法",
    categoryId,
    mode: "fixed",
    status,
    linkType: "none",
    offsetMinutes: 0,
    date: "2026-07-18",
    day: 4,
    start: 600,
    end: 660,
    weekOffset: 0,
    source,
    notificationMinutes: null,
    completedAt,
  };
}

function createStudyRecord(
  id: string,
  studyDate: string,
  createdAt: string,
): StudyTimeRecord {
  return {
    id,
    taskId: "study-event",
    taskTitle: "宅建業法",
    categoryId: "takken-law",
    categoryName: "宅建業法",
    studyDate,
    minutes: 60,
    source: "scheduled_duration",
    createdAt,
    updatedAt: createdAt,
  };
}

describe("積み上げ集計", () => {
  it("勉強日の最長連続日数を全期間から計算する", () => {
    const records = [
      createStudyRecord("1", "2026-07-10", "2026-07-10T01:00:00Z"),
      createStudyRecord("2", "2026-07-11", "2026-07-11T01:00:00Z"),
      createStudyRecord("3", "2026-07-12", "2026-07-12T01:00:00Z"),
      createStudyRecord("4", "2026-07-15", "2026-07-15T01:00:00Z"),
      createStudyRecord("5", "2026-07-16", "2026-07-16T01:00:00Z"),
    ];
    expect(getLongestStudyStreak(records)).toBe(3);
  });

  it("累計・今月・30日グラフ・マイルストーン・最新10件を一括集計する", () => {
    const studyRecords = [
      createStudyRecord("study-16", "2026-07-16", "2026-07-16T11:00:00Z"),
      createStudyRecord("study-17", "2026-07-17", "2026-07-17T11:00:00Z"),
      createStudyRecord("study-18", "2026-07-18", "2026-07-18T10:00:00Z"),
    ];
    const events = [
      createEvent(
        "study-event",
        "takken-law",
        "completed",
        "2026-07-18T10:00:00Z",
      ),
      createEvent(
        "walk-event",
        "walk",
        "completed",
        "2026-07-18T11:00:00Z",
      ),
      createEvent(
        "routine-completed",
        "walk",
        "completed",
        "2026-07-18T09:00:00Z",
        "fixed-template",
      ),
      createEvent(
        "routine-pending",
        "walk",
        "pending",
        undefined,
        "fixed-template",
      ),
    ];
    const logs: LifeLog[] = [
      {
        id: "log-1",
        title: "新しいアイデア",
        body: "",
        status: "inbox",
        focusArea: "unset",
        createdAt: "2026-07-18T12:00:00Z",
        updatedAt: "2026-07-18T12:00:00Z",
      },
    ];

    const dashboard = getGrowthDashboard(
      studyRecords,
      events,
      categories,
      logs,
      new Date("2026-07-18T13:00:00Z"),
    );

    expect(dashboard).toMatchObject({
      totalStudyMinutes: 180,
      longestStudyStreak: 3,
      totalCompletedTasks: 3,
      totalLifeLogs: 1,
      monthStudyMinutes: 180,
      monthCompletedTasks: 3,
      monthLifeLogs: 1,
      monthRoutineAchievementRate: 50,
    });
    expect(dashboard.dailyPoints).toHaveLength(30);
    expect(dashboard.dailyPoints.at(-1)).toMatchObject({
      date: "2026-07-18",
      studyMinutes: 60,
      completedTasks: 3,
    });
    expect(dashboard.milestones[0]).toEqual({
      hours: 100,
      achieved: false,
      remainingMinutes: 5820,
    });
    expect(dashboard.recentItems).toHaveLength(6);
    expect(dashboard.recentItems[0]).toMatchObject({
      type: "life-log",
      title: "新しいアイデア",
    });
    expect(
      dashboard.recentItems.filter((item) => item.title === "宅建業法"),
    ).toHaveLength(3);
  });
});
