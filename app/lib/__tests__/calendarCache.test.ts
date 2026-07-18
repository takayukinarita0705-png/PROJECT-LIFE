import { describe, expect, it } from "vitest";
import {
  areSharedCalendarStatesEqual,
  loadCachedCalendarState,
  parseCachedCalendarState,
  saveCachedCalendarState,
} from "@/app/lib/calendarCache";
import type { SharedCalendarState } from "@/app/types/calendar";

const state: SharedCalendarState = {
  version: 1,
  schemaVersion: 10,
  categories: [],
  events: [],
  templates: [],
  logs: [],
  studyRecords: [
    {
      id: "study-record",
      taskId: "study-event",
      studyDate: "2026-07-03",
      minutes: 45,
      source: "scheduled_duration",
      createdAt: "2026-07-03T01:00:00.000Z",
      updatedAt: "2026-07-03T01:00:00.000Z",
    },
  ],
  studyDailyGoalMinutes: 60,
};

describe("カレンダーのローカルキャッシュ", () => {
  it("Storageへ保存した共有Stateを復元する", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    saveCachedCalendarState(state, storage);

    expect(loadCachedCalendarState(storage)).toEqual(state);
  });

  it("壊れたキャッシュを無視する", () => {
    expect(parseCachedCalendarState("{broken")).toBeNull();
    expect(parseCachedCalendarState(null)).toBeNull();
  });

  it("schemaVersionがないV1キャッシュを現在Versionへ移行する", () => {
    const cachedV1 = JSON.stringify({
      version: 1,
      categories: [],
      events: [],
      templates: [],
    });

    expect(parseCachedCalendarState(cachedV1)?.schemaVersion).toBe(10);
    expect(parseCachedCalendarState(cachedV1)?.logs).toEqual([]);
    expect(parseCachedCalendarState(cachedV1)?.studyRecords).toEqual([]);
    expect(parseCachedCalendarState(cachedV1)?.studyDailyGoalMinutes).toBe(60);
  });

  it("旧completed形式のLifeLogを完了履歴としてキャッシュ復元する", () => {
    const cached = JSON.stringify({
      ...state,
      logs: [
        {
          id: "completed-log",
          title: "完了したログ",
          body: "",
          status: "completed",
          focusArea: "future",
          createdAt: "2026-07-18T00:00:00.000Z",
          updatedAt: "2026-07-19T01:00:00.000Z",
        },
      ],
    });

    expect(parseCachedCalendarState(cached)?.logs).toMatchObject([
      {
        id: "completed-log",
        status: "done",
        completedAt: "2026-07-19T01:00:00.000Z",
      },
    ]);
  });

  it("Supabase取得Stateの差分を判定する", () => {
    expect(areSharedCalendarStatesEqual(state, { ...state })).toBe(true);
    expect(
      areSharedCalendarStatesEqual(state, {
        ...state,
        events: [
          {
            id: "updated",
            categoryId: "work",
            mode: "fixed",
            status: "pending",
            linkType: "none",
            offsetMinutes: 0,
            notificationMinutes: null,
            date: "2026-07-03",
            day: 3,
            start: 540,
            end: 600,
            weekOffset: 0,
          },
        ],
      }),
    ).toBe(false);
  });
});
