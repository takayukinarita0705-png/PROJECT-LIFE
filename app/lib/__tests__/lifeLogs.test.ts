import { describe, expect, it } from "vitest";
import {
  getCurrentWeekLifeLogs,
  getInboxLifeLogs,
  getLifeLogTimelineGroups,
  getLifeLogsForEvent,
  normalizeLifeLogBody,
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

  it("既存ログをInboxへ移行し、一覧対象をInboxだけにする", () => {
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
    ).toEqual(["older"]);
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
        id: "monday",
        createdAt: new Date(2026, 5, 29, 9).toISOString(),
      },
      {
        ...newerLog,
        id: "friday",
        createdAt: new Date(2026, 6, 3, 18).toISOString(),
      },
    ];

    expect(
      getCurrentWeekLifeLogs(logs, referenceDate).map(({ id }) => id),
    ).toEqual(["friday", "monday"]);
  });
});
