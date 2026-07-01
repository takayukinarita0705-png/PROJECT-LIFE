import { describe, expect, it } from "vitest";
import {
  formatActualMinutes,
  getTodayActuals,
  getTodayProgress,
  isCurrentMobileEvent,
} from "@/app/components/MobileSchedule";
import type {
  CalendarEvent,
  Category,
  ScheduleItem,
} from "@/app/types/calendar";

const overnightSleep: CalendarEvent = {
  id: "overnight-sleep",
  categoryId: "sleep",
  mode: "fixed",
  status: "pending",
  linkType: "none",
  offsetMinutes: 0,
  date: "2026-07-01",
  day: 0,
  start: 22 * 60,
  end: 5 * 60,
  weekOffset: 0,
};

const category: Category = {
  id: "study",
  name: "宅建業法",
  color: "#ef4444",
  icon: "📕",
  group: "study",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function createScheduleItem(
  id: string,
  status: CalendarEvent["status"],
  start: number,
  end: number,
  itemCategory = category,
): ScheduleItem {
  return {
    event: {
      ...overnightSleep,
      id,
      categoryId: itemCategory.id,
      status,
      start,
      end,
    },
    category: itemCategory,
  };
}

describe("日またぎ予定の進行中判定", () => {
  it("開始後と翌日側の終了前を進行中として扱う", () => {
    expect(
      isCurrentMobileEvent(overnightSleep, "2026-07-01", 23 * 60 + 30),
    ).toBe(true);
    expect(
      isCurrentMobileEvent(overnightSleep, "2026-07-01", 4 * 60 + 59),
    ).toBe(true);
  });

  it("終了時刻以降と予定日以外では進行中にしない", () => {
    expect(
      isCurrentMobileEvent(overnightSleep, "2026-07-01", 5 * 60),
    ).toBe(false);
    expect(
      isCurrentMobileEvent(overnightSleep, "2026-07-02", 23 * 60),
    ).toBe(false);
  });
});

describe("今日の達成状況", () => {
  it("completedだけを完了として件数と達成率を計算する", () => {
    expect(
      getTodayProgress([
        { status: "completed" },
        { status: "skipped" },
        { status: "pending" },
        {},
      ]),
    ).toEqual({
      completed: 1,
      total: 4,
      percentage: 25,
    });
  });

  it("今日の予定がない場合は達成率を0%にする", () => {
    expect(getTodayProgress([])).toEqual({
      completed: 0,
      total: 0,
      percentage: 0,
    });
  });
});

describe("今日の実績", () => {
  it("completedだけをカテゴリ別に合計する", () => {
    const walkCategory = {
      ...category,
      id: "walk",
      name: "散歩",
      icon: "🚶",
    };
    const actuals = getTodayActuals([
      createScheduleItem("study-1", "completed", 540, 570),
      createScheduleItem("study-2", "completed", 600, 620),
      createScheduleItem("pending", "pending", 620, 680),
      createScheduleItem("skipped", "skipped", 680, 740),
      createScheduleItem("walk", "completed", 300, 320, walkCategory),
    ]);

    expect(actuals).toEqual([
      {
        categoryId: "study",
        name: "宅建業法",
        icon: "📕",
        color: "#ef4444",
        minutes: 50,
      },
      {
        categoryId: "walk",
        name: "散歩",
        icon: "🚶",
        color: "#ef4444",
        minutes: 20,
      },
    ]);
  });

  it("分数をコンパクトな時間表記へ変換する", () => {
    expect(formatActualMinutes(50)).toBe("50分");
    expect(formatActualMinutes(600)).toBe("10時間");
    expect(formatActualMinutes(90)).toBe("1時間30分");
  });
});
