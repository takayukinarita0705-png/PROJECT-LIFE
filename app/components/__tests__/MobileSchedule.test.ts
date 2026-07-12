import { describe, expect, it } from "vitest";
import { isCurrentMobileEvent } from "@/app/components/MobileSchedule";
import {
  formatActualMinutes,
  formatSignedActualMinutes,
  getActualsByCategory,
  getCompletionStreak,
  getHabitHeatmap,
  getHabitWeeklyComparison,
  getHabitActualRanking,
  getScheduleRecord,
  getTodayProgress,
  getWeeklyMvp,
  getWeeklyCategoryGoals,
  getWeeklyReviewMessage,
  isPerformanceTrackedCategory,
} from "@/app/lib/records";
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
  notificationMinutes: null,
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
    const actuals = getActualsByCategory([
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

  it("睡眠を実績とチェック対象から除外する", () => {
    const sleepCategory = {
      ...category,
      id: "sleep",
      name: "睡眠",
      icon: "🌙",
    };
    const sleep = createScheduleItem(
      "sleep",
      "completed",
      22 * 60,
      24 * 60,
      sleepCategory,
    );

    expect(getActualsByCategory([sleep])).toEqual([]);
    expect(getScheduleRecord([sleep])).toMatchObject({
      total: 0,
      completed: 0,
      totalMinutes: 0,
    });
    expect(isPerformanceTrackedCategory(sleepCategory)).toBe(false);
  });
});

describe("今週の記録", () => {
  it("完了・スキップ・未完了・実績時間・達成率を集計する", () => {
    const schedule = [
      createScheduleItem("completed-1", "completed", 540, 600),
      createScheduleItem("completed-2", "completed", 600, 690),
      createScheduleItem("skipped", "skipped", 690, 750),
      createScheduleItem("pending", "pending", 750, 810),
    ];

    expect(getScheduleRecord(schedule)).toMatchObject({
      total: 4,
      completed: 2,
      skipped: 1,
      pending: 1,
      percentage: 50,
      totalMinutes: 150,
      actuals: [
        {
          categoryId: "study",
          minutes: 150,
        },
      ],
    });
  });

  it("予定がない週は達成率と実績時間を0にする", () => {
    expect(getScheduleRecord([])).toEqual({
      total: 0,
      completed: 0,
      skipped: 0,
      pending: 0,
      percentage: 0,
      totalMinutes: 0,
      actuals: [],
    });
  });

  it("達成率に応じた固定レビューコメントを返す", () => {
    expect(getWeeklyReviewMessage(80)).toBe(
      "今週はかなり良いペースです",
    );
    expect(getWeeklyReviewMessage(50)).toBe(
      "まずまず進められています",
    );
    expect(getWeeklyReviewMessage(49)).toBe(
      "来週は少し予定を軽くしてもよさそうです",
    );
  });
});

describe("連続達成", () => {
  const referenceDate = new Date(2026, 6, 3, 12);

  function completedEvent(id: string, date: string): CalendarEvent {
    return {
      ...overnightSleep,
      id,
      date,
      status: "completed",
    };
  }

  it("今日から連続してcompletedがある日数を数える", () => {
    expect(
      getCompletionStreak(
        [
          completedEvent("today", "2026-07-03"),
          completedEvent("yesterday", "2026-07-02"),
          completedEvent("two-days-ago", "2026-07-01"),
          completedEvent("old", "2026-06-29"),
        ],
        referenceDate,
      ),
    ).toBe(3);
  });

  it("同じ日に複数完了しても1日として数える", () => {
    expect(
      getCompletionStreak(
        [
          completedEvent("today-1", "2026-07-03"),
          completedEvent("today-2", "2026-07-03"),
        ],
        referenceDate,
      ),
    ).toBe(1);
  });

  it("今日completedがなければ0日とする", () => {
    expect(
      getCompletionStreak(
        [
          completedEvent("yesterday", "2026-07-02"),
          { ...completedEvent("today", "2026-07-03"), status: "pending" },
        ],
        referenceDate,
      ),
    ).toBe(0);
  });
});

describe("習慣ヒートマップ", () => {
  const referenceDate = new Date(2026, 6, 3, 12);
  const excludedNames = [
    "仕事",
    "ご飯",
    "ご飯作り",
    "お風呂",
    "睡眠",
    "通勤",
  ];
  const excludedCategories = excludedNames.map((name, index) => ({
    ...category,
    id: `excluded-${index}`,
    name,
  }));

  function habitEvent(
    id: string,
    date: string,
    status: CalendarEvent["status"],
    categoryId = category.id,
  ): CalendarEvent {
    return {
      ...overnightSleep,
      id,
      date,
      status,
      categoryId,
    };
  }

  it("今日を含む直近28日を古い日から返す", () => {
    const heatmap = getHabitHeatmap([], [category], referenceDate);

    expect(heatmap).toHaveLength(28);
    expect(heatmap[0].date).toBe("2026-06-06");
    expect(heatmap[27].date).toBe("2026-07-03");
  });

  it("日別達成率を4段階へ分類する", () => {
    const events = [
      habitEvent("high-1", "2026-07-03", "completed"),
      habitEvent("high-2", "2026-07-03", "completed"),
      habitEvent("high-3", "2026-07-03", "completed"),
      habitEvent("high-4", "2026-07-03", "completed"),
      habitEvent("high-pending", "2026-07-03", "pending"),
      habitEvent("partial", "2026-07-02", "completed"),
      habitEvent("partial-pending", "2026-07-02", "pending"),
      habitEvent("zero", "2026-07-01", "pending"),
    ];
    const heatmap = getHabitHeatmap(events, [category], referenceDate);

    expect(heatmap.at(-1)).toMatchObject({
      percentage: 80,
      level: "high",
    });
    expect(heatmap.at(-2)).toMatchObject({
      percentage: 50,
      level: "partial",
    });
    expect(heatmap.at(-3)).toMatchObject({
      percentage: 0,
      level: "zero",
    });
    expect(heatmap.at(-4)).toMatchObject({
      percentage: null,
      level: "none",
    });
  });

  it("生活上の基本カテゴリをカウント対象から除外する", () => {
    const events = excludedCategories.map((item) =>
      habitEvent(
        `event-${item.id}`,
        "2026-07-03",
        "completed",
        item.id,
      ),
    );
    const today = getHabitHeatmap(
      events,
      [category, ...excludedCategories],
      referenceDate,
    ).at(-1);

    expect(today).toMatchObject({
      total: 0,
      completed: 0,
      percentage: null,
      level: "none",
    });
  });
});

describe("習慣実績ランキング", () => {
  it("除外カテゴリと0分を除き実績時間の長い順に並べる", () => {
    const ranking = getHabitActualRanking([
      {
        categoryId: "rights",
        name: "権利関係",
        icon: "⚖️",
        color: "#f97316",
        minutes: 130,
      },
      {
        categoryId: "work",
        name: "仕事",
        icon: "💼",
        color: "#3b82f6",
        minutes: 600,
      },
      {
        categoryId: "takken-law",
        name: "宅建業法",
        icon: "📕",
        color: "#ef4444",
        minutes: 260,
      },
      {
        categoryId: "walk",
        name: "散歩",
        icon: "🚶",
        color: "#84cc16",
        minutes: 100,
      },
      {
        categoryId: "reading",
        name: "読書",
        icon: "📚",
        color: "#6366f1",
        minutes: 0,
      },
    ]);

    expect(ranking.map(({ categoryId }) => categoryId)).toEqual([
      "takken-law",
      "rights",
      "walk",
    ]);
  });

  it("除外対象6カテゴリをすべてランキングから外す", () => {
    const ranking = getHabitActualRanking(
      ["仕事", "ご飯", "ご飯作り", "お風呂", "睡眠", "通勤"].map(
        (name, index) => ({
          categoryId: `excluded-${index}`,
          name,
          icon: "•",
          color: "#64748b",
          minutes: 60,
        }),
      ),
    );

    expect(ranking).toEqual([]);
  });
});

describe("今週一番頑張ったこと", () => {
  const rightsCategory: Category = {
    ...category,
    id: "rights",
    name: "権利関係",
    icon: "⚖️",
  };

  it("時間が同率ならcompleted件数が多いカテゴリを選ぶ", () => {
    const currentSchedule = [
      createScheduleItem("study-1", "completed", 540, 600),
      createScheduleItem("study-2", "completed", 600, 660),
      createScheduleItem(
        "rights",
        "completed",
        540,
        660,
        rightsCategory,
      ),
      createScheduleItem(
        "pending",
        "pending",
        0,
        600,
        rightsCategory,
      ),
    ];
    const mvp = getWeeklyMvp(currentSchedule, []);

    expect(mvp).toMatchObject({
      categoryId: category.id,
      minutes: 120,
      count: 2,
      hasPreviousData: false,
    });
  });

  it("今週MVPカテゴリの先週実績との差分を返す", () => {
    const currentSchedule = [
      createScheduleItem("study", "completed", 540, 800),
    ];
    const previousSchedule = [
      createScheduleItem("study-old", "completed", 540, 600),
      createScheduleItem(
        "rights-old",
        "completed",
        600,
        720,
        rightsCategory,
      ),
    ];
    const mvp = getWeeklyMvp(currentSchedule, previousSchedule);

    expect(mvp).toMatchObject({
      categoryId: category.id,
      minutes: 260,
      previousMinutes: 60,
      differenceMinutes: 200,
      hasPreviousData: true,
    });
  });

  it("今週にcompleted実績がなければMVPなしとする", () => {
    expect(
      getWeeklyMvp(
        [createScheduleItem("pending", "pending", 540, 600)],
        [],
      ),
    ).toBeNull();
  });
});

describe("先週との比較", () => {
  it("習慣対象のcompleted実績だけを今週と先週で比較する", () => {
    const workCategory: Category = {
      ...category,
      id: "work",
      name: "仕事",
      icon: "💼",
    };
    const currentSchedule = [
      createScheduleItem("study", "completed", 540, 660),
      createScheduleItem("pending", "pending", 660, 780),
      createScheduleItem(
        "work",
        "completed",
        0,
        600,
        workCategory,
      ),
    ];
    const previousSchedule = [
      createScheduleItem("study-old", "completed", 540, 600),
      createScheduleItem(
        "work-old",
        "completed",
        0,
        600,
        workCategory,
      ),
    ];

    expect(
      getHabitWeeklyComparison(currentSchedule, previousSchedule),
    ).toEqual({
      currentMinutes: 120,
      previousMinutes: 60,
      differenceMinutes: 60,
    });
  });

  it("時間差へ符号を付ける", () => {
    expect(formatSignedActualMinutes(100)).toBe("+1時間40分");
    expect(formatSignedActualMinutes(-60)).toBe("-1時間");
    expect(formatSignedActualMinutes(0)).toBe("±0分");
  });
});

describe("カテゴリ別週間目標", () => {
  it("目標・現在・残り時間をカテゴリ別に計算する", () => {
    const goalCategory: Category = {
      ...category,
      weeklyGoalMinutes: 15 * 60,
    };
    const goals = getWeeklyCategoryGoals(
      [goalCategory],
      [
        {
          categoryId: goalCategory.id,
          name: goalCategory.name,
          icon: goalCategory.icon,
          color: goalCategory.color,
          minutes: 12 * 60 + 40,
        },
      ],
    );

    expect(goals[0]).toMatchObject({
      goalMinutes: 900,
      currentMinutes: 760,
      remainingMinutes: 140,
    });
  });

  it("指定された生活カテゴリを目標対象から除外する", () => {
    const categories = [
      "仕事",
      "睡眠",
      "ご飯",
      "お風呂",
      "通勤",
    ].map((name, index) => ({
      ...category,
      id: `excluded-${index}`,
      name,
    }));

    expect(getWeeklyCategoryGoals(categories, [])).toEqual([]);
  });

  it("目標未設定カテゴリは現在時間を保ち残りをnullにする", () => {
    expect(getWeeklyCategoryGoals([category], [])[0]).toMatchObject({
      goalMinutes: null,
      currentMinutes: 0,
      remainingMinutes: null,
    });
  });
});
