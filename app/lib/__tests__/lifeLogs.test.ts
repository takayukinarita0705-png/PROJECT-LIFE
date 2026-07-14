import { describe, expect, it } from "vitest";
import {
  canScheduleLifeLog,
  classifyLifeLog,
  createLifeLogScheduledEvent,
  getFutureLifeLogs,
  getFutureInboxLifeLogCount,
  getFutureLifeLogWeeklyRecord,
  getCurrentWeekLifeLogs,
  getInboxLifeLogs,
  getInboxReviewState,
  getLifeLogFocusAreaLabel,
  getLifeLogStatusLabel,
  getLifeLogStatusForEventStatus,
  getLifeLogTimelineGroups,
  getLifeLogsForEvent,
  getLifeLogsByFocusFilter,
  getLifeLogScheduleTiming,
  getUnclassifiedLifeLogs,
  markLifeLogAsInbox,
  markLifeLogAsScheduled,
  normalizeLifeLogBody,
  restoreLifeLogFocusArea,
  sortLifeLogsNewestFirst,
} from "@/app/lib/lifeLogs";
import { normalizeLifeLog } from "@/app/lib/storage";
import type { LifeLog } from "@/app/types/calendar";

const olderLog: LifeLog = {
  id: "older",
  body: "古いログ",
  status: "inbox",
  focusArea: "unset",
  createdAt: "2026-07-01T01:00:00.000Z",
  updatedAt: "2026-07-01T01:00:00.000Z",
};

const newerLog: LifeLog = {
  id: "newer",
  body: "新しいログ",
  status: "inbox",
  focusArea: "unset",
  createdAt: "2026-07-02T01:00:00.000Z",
  updatedAt: "2026-07-02T01:00:00.000Z",
};

describe("ライフログ", () => {
  it("本文をtrimし、空文字を拒否する", () => {
    expect(normalizeLifeLogBody("  出来事  ")).toBe("出来事");
    expect(normalizeLifeLogBody("   ")).toBeNull();
  });

  it("すべてのfocusAreaで未予定化ログを予定化できる", () => {
    const focusAreas: LifeLog["focusArea"][] = [
      "unset",
      "now",
      "future",
      "review",
      "discard",
    ];

    expect(
      focusAreas.every((focusArea) =>
        canScheduleLifeLog({ ...olderLog, focusArea }),
      ),
    ).toBe(true);
  });

  it("予定化済み・完了済み・eventIdがあるログは重複予定化できない", () => {
    expect(
      canScheduleLifeLog({
        ...olderLog,
        status: "scheduled",
        eventId: "event-1",
      }),
    ).toBe(false);
    expect(
      canScheduleLifeLog({
        ...olderLog,
        status: "done",
        eventId: "event-1",
      }),
    ).toBe(false);
    expect(
      canScheduleLifeLog({ ...olderLog, eventId: "legacy-event" }),
    ).toBe(false);
  });

  it.each([
    [30, 9 * 60 + 30],
    [60, 10 * 60],
    [90, 10 * 60 + 30],
    [120, 11 * 60],
  ] as const)("所要時間%s分後を正しく計算する", (duration, expectedEnd) => {
    expect(
      getLifeLogScheduleTiming("2026-07-14", "09:00", duration),
    ).toMatchObject({
      date: "2026-07-14",
      start: 9 * 60,
      end: expectedEnd,
      endDate: "2026-07-14",
    });
  });

  it("カスタム終了時刻を保存できる", () => {
    expect(
      getLifeLogScheduleTiming(
        "2026-07-14",
        "09:00",
        "custom",
        "10:15",
      ),
    ).toEqual({
      date: "2026-07-14",
      start: 9 * 60,
      end: 10 * 60 + 15,
      endDate: "2026-07-14",
    });
  });

  it("日付またぎを翌日の終了日・時刻として計算する", () => {
    expect(
      getLifeLogScheduleTiming("2026-07-14", "23:45", 30),
    ).toEqual({
      date: "2026-07-14",
      start: 23 * 60 + 45,
      end: 24 * 60 + 15,
      endDate: "2026-07-15",
    });
    expect(
      getLifeLogScheduleTiming(
        "2026-07-14",
        "23:45",
        "custom",
        "00:30",
      ),
    ).toMatchObject({
      end: 24 * 60 + 30,
      endDate: "2026-07-15",
    });
  });

  it("ログ由来予定をフリーカテゴリ・本文タイトル・通知設定付きで作る", () => {
    const event = createLifeLogScheduledEvent(
      { ...olderLog, body: "  歯医者へ行く  " },
      "  歯医者へ行く  ",
      {
        date: "2026-07-14",
        start: 9 * 60,
        end: 9 * 60 + 30,
        endDate: "2026-07-14",
        notificationMinutes: 10,
      },
      "event-1",
      new Date(2026, 6, 14, 12),
    );

    expect(event).toMatchObject({
      id: "event-1",
      title: "歯医者へ行く",
      categoryId: "free",
      lifeLogId: olderLog.id,
      status: "pending",
      notificationMinutes: 10,
    });
  });

  it("Future Engineの分類ラベルを返す", () => {
    expect(getLifeLogFocusAreaLabel("unset")).toBe("未分類");
    expect(getLifeLogFocusAreaLabel("now")).toBe("🔴 今すぐやる");
    expect(getLifeLogFocusAreaLabel("future")).toBe("🟡 未来を作る");
    expect(getLifeLogFocusAreaLabel("review")).toBe("🔵 見直す");
    expect(getLifeLogFocusAreaLabel("discard")).toBe("⚪ 手放す");
  });

  it("作成日時の新しい順に並べる", () => {
    expect(
      sortLifeLogsNewestFirst([olderLog, newerLog]).map(({ id }) => id),
    ).toEqual(["newer", "older"]);
  });

  it("保存データを正規化する", () => {
    expect(
      normalizeLifeLog({
        ...olderLog,
        body: "  記録  ",
        eventId: "event-1",
      }),
    ).toEqual({
      ...olderLog,
      body: "記録",
      eventId: "event-1",
    });
    expect(normalizeLifeLog({ ...olderLog, createdAt: "invalid" })).toBeNull();
  });

  it("Inboxでは全ログを新しい順で一覧対象にする", () => {
    expect(normalizeLifeLog(olderLog)?.status).toBe("inbox");
    expect(
      normalizeLifeLog({
        ...olderLog,
        status: undefined,
        focusArea: undefined,
      })?.status,
    ).toBe("inbox");
    expect(
      normalizeLifeLog({
        ...olderLog,
        status: undefined,
        focusArea: undefined,
      })?.focusArea,
    ).toBe("unset");
    expect(
      getInboxLifeLogs([
        olderLog,
        { ...newerLog, status: "scheduled" },
        { ...newerLog, id: "done", status: "done" },
      ]).map(({ id }) => id),
    ).toEqual(["newer", "done", "older"]);
    expect(getLifeLogStatusLabel("inbox")).toBe("inbox");
    expect(getLifeLogStatusLabel("scheduled")).toBe("scheduled");
    expect(getLifeLogStatusLabel("done")).toBe("done");
  });

  it("未来を作るログだけを新しい順で取得する", () => {
    expect(
      getFutureLifeLogs([
        { ...olderLog, focusArea: "future" },
        { ...newerLog, focusArea: "future", status: "scheduled" },
        { ...newerLog, id: "done", focusArea: "future", status: "done" },
        { ...newerLog, id: "now", focusArea: "now" },
        { ...newerLog, id: "review", focusArea: "review" },
        { ...newerLog, id: "discard", focusArea: "discard" },
        newerLog,
      ]).map(({ id }) => id),
    ).toEqual(["newer", "done", "older"]);
  });

  it("未来を作るかつInboxのログ件数だけを数える", () => {
    expect(
      getFutureInboxLifeLogCount([
        { ...olderLog, focusArea: "future", status: "inbox" },
        { ...newerLog, focusArea: "future", status: "scheduled" },
        { ...newerLog, id: "done", focusArea: "future", status: "done" },
        { ...newerLog, id: "unset", focusArea: "unset", status: "inbox" },
      ]),
    ).toBe(1);
  });

  it("分類フィルターで該当するログだけを新しい順で取得する", () => {
    const logs = [
      { ...olderLog, id: "unset", focusArea: "unset" as const },
      { ...newerLog, id: "now", focusArea: "now" as const },
      { ...newerLog, id: "future", focusArea: "future" as const },
      { ...newerLog, id: "review", focusArea: "review" as const },
      { ...newerLog, id: "discard", focusArea: "discard" as const },
    ];

    expect(getLifeLogsByFocusFilter(logs, "all").map(({ id }) => id)).toEqual([
      "now",
      "future",
      "review",
      "discard",
      "unset",
    ]);
    expect(getLifeLogsByFocusFilter(logs, "unset").map(({ id }) => id)).toEqual([
      "unset",
    ]);
    expect(getLifeLogsByFocusFilter(logs, "future").map(({ id }) => id)).toEqual([
      "future",
    ]);
    expect(getLifeLogsByFocusFilter(logs, "discard").map(({ id }) => id)).toEqual([
      "discard",
    ]);
  });

  it("Inbox整理対象として未分類ログだけを作成日時の新しい順で取得する", () => {
    expect(
      getUnclassifiedLifeLogs([
        { ...olderLog, id: "old-unset", focusArea: "unset" },
        { ...newerLog, id: "future", focusArea: "future" },
        { ...newerLog, id: "new-unset", focusArea: "unset" },
      ]).map(({ id }) => id),
    ).toEqual(["new-unset", "old-unset"]);
  });

  it("分類後は次の未分類ログへ進む", () => {
    const logs = [
      { ...olderLog, id: "old-unset", focusArea: "unset" as const },
      { ...newerLog, id: "new-unset", focusArea: "unset" as const },
    ];
    const classified = classifyLifeLog(
      logs,
      "new-unset",
      "future",
      "2026-07-03T00:00:00.000Z",
    );

    expect(getInboxReviewState(classified)).toMatchObject({
      currentLog: { id: "old-unset" },
      remainingCount: 1,
      isComplete: false,
    });
  });

  it("元に戻すと直前の分類状態へ戻る", () => {
    const previousLog = { ...newerLog, id: "target", focusArea: "unset" as const };
    const classified = classifyLifeLog(
      [previousLog],
      "target",
      "review",
      "2026-07-03T00:00:00.000Z",
    );

    expect(restoreLifeLogFocusArea(classified, previousLog)).toEqual([
      previousLog,
    ]);
  });

  it("未分類が0件ならInbox整理を完了状態にする", () => {
    expect(
      getInboxReviewState([
        { ...olderLog, focusArea: "now" },
        { ...newerLog, focusArea: "discard" },
      ]),
    ).toEqual({
      currentLog: null,
      remainingCount: 0,
      isComplete: true,
    });
  });

  it("予定化後も本文を維持してstatusだけをscheduledへ更新する", () => {
    expect(
      markLifeLogAsScheduled(
        { ...olderLog, focusArea: "future" },
        "2026-07-03T01:00:00.000Z",
        "event-1",
      ),
    ).toEqual({
      ...olderLog,
      focusArea: "future",
      status: "scheduled",
      eventId: "event-1",
      updatedAt: "2026-07-03T01:00:00.000Z",
    });
  });

  it("紐付いた予定の状態からLifeLog statusを決める", () => {
    expect(getLifeLogStatusForEventStatus("completed")).toBe("done");
    expect(getLifeLogStatusForEventStatus("pending")).toBe("scheduled");
    expect(getLifeLogStatusForEventStatus("skipped")).toBe("scheduled");
    expect(getLifeLogStatusForEventStatus("active")).toBe("scheduled");
  });

  it("紐付いた予定が削除されたログはInboxへ戻す", () => {
    expect(
      markLifeLogAsInbox(
        { ...olderLog, status: "scheduled", eventId: "event-1" },
        "2026-07-03T01:00:00.000Z",
      ),
    ).toEqual({
      ...olderLog,
      status: "inbox",
      eventId: undefined,
      updatedAt: "2026-07-03T01:00:00.000Z",
    });
  });

  it("予定に紐付くログだけを新しい順で取得する", () => {
    expect(
      getLifeLogsForEvent(
        [
          { ...olderLog, eventId: "event-1" },
          { ...newerLog, eventId: "event-1" },
          { ...newerLog, id: "other", eventId: "event-2" },
        ],
        "event-1",
      ).map(({ id }) => id),
    ).toEqual(["newer", "older"]);
  });

  it("日付ごとに今日・昨日の順でグループ化する", () => {
    const referenceDate = new Date(2026, 6, 3, 12);
    const todayLog: LifeLog = {
      ...newerLog,
      id: "today",
      createdAt: new Date(2026, 6, 3, 14, 20).toISOString(),
    };
    const yesterdayLog: LifeLog = {
      ...olderLog,
      id: "yesterday",
      createdAt: new Date(2026, 6, 2, 21, 10).toISOString(),
    };
    const groups = getLifeLogTimelineGroups(
      [yesterdayLog, todayLog],
      referenceDate,
    );

    expect(groups.map(({ label }) => label)).toEqual(["今日", "昨日"]);
    expect(groups[0].logs.map(({ id }) => id)).toEqual(["today"]);
    expect(groups[1].logs.map(({ id }) => id)).toEqual(["yesterday"]);
  });

  it("今週作成されたログだけを新しい順で取得する", () => {
    const referenceDate = new Date(2026, 6, 3, 12);
    const logs = [
      {
        ...olderLog,
        id: "last-week",
        createdAt: new Date(2026, 5, 28, 12).toISOString(),
      },
      {
        ...olderLog,
        id: "tuesday",
        createdAt: new Date(2026, 5, 30, 9).toISOString(),
      },
      {
        ...newerLog,
        id: "friday",
        createdAt: new Date(2026, 6, 3, 18).toISOString(),
      },
    ];

    expect(
      getCurrentWeekLifeLogs(logs, referenceDate).map(({ id }) => id),
    ).toEqual(["friday", "tuesday"]);
  });

  it("火曜日始まりの今週でFuture Engineの流れを集計する", () => {
    const referenceDate = new Date(2026, 6, 1, 12);
    const logs: LifeLog[] = [
      {
        ...olderLog,
        id: "previous-monday",
        focusArea: "future",
        status: "done",
        createdAt: new Date(2026, 5, 29, 12).toISOString(),
      },
      {
        ...olderLog,
        id: "idea",
        focusArea: "unset",
        status: "inbox",
        createdAt: new Date(2026, 5, 30, 8).toISOString(),
      },
      {
        ...olderLog,
        id: "future",
        focusArea: "future",
        status: "inbox",
        createdAt: new Date(2026, 6, 1, 9).toISOString(),
      },
      {
        ...olderLog,
        id: "scheduled",
        focusArea: "future",
        status: "scheduled",
        createdAt: new Date(2026, 6, 2, 10).toISOString(),
      },
      {
        ...olderLog,
        id: "done",
        focusArea: "future",
        status: "done",
        createdAt: new Date(2026, 6, 6, 22).toISOString(),
      },
    ];

    expect(getFutureLifeLogWeeklyRecord(logs, referenceDate)).toEqual({
      total: 4,
      future: 3,
      scheduled: 2,
      done: 1,
    });
  });
});
