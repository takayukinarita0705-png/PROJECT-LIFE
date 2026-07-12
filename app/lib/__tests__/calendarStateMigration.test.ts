import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  migrateState,
  migrateStateV1ToV2,
  migrateStateV2ToV3,
  migrateStateV3ToV4,
  migrateStateV4ToV5,
  migrateStateV5ToV6,
  migrateStateV6ToV7,
} from "@/app/lib/migrations/calendarState";

describe("保存StateのSchema Migration", () => {
  const migrationDate = new Date(2026, 6, 1, 12);

  it("schemaVersionがない旧Eventへ絶対日付を補完する", () => {
    const migrated = migrateState({
      version: 1,
      categories: [],
      events: [
        {
          id: "current-week-monday",
          day: 0,
          weekOffset: 0,
        },
        {
          id: "next-week-wednesday",
          day: 2,
          weekOffset: 1,
        },
      ],
      templates: [
        {
          id: "legacy-template",
          events: [{ day: 0, start: 540, end: 600 }],
        },
      ],
    }, migrationDate);

    expect(migrated).toMatchObject({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      events: [
        {
          id: "current-week-monday",
          date: "2026-06-29",
        },
        {
          id: "next-week-wednesday",
          date: "2026-07-08",
        },
      ],
    });
    const templates = migrated?.templates as
      | Array<{ events: Array<Record<string, unknown>> }>
      | undefined;
    expect(templates?.[0].events[0]).not.toHaveProperty("date");
  });

  it("V2の既存ログへinboxを補完してV3へ変換する", () => {
    expect(
      migrateStateV2ToV3({
        schemaVersion: 2,
        logs: [
          { id: "legacy" },
          { id: "scheduled", status: "scheduled" },
        ],
      }),
    ).toMatchObject({
      schemaVersion: 3,
      logs: [
        { id: "legacy", status: "inbox" },
        { id: "scheduled", status: "scheduled" },
      ],
    });
  });

  it("V3の既存ログへfocusArea: unsetを補完してV4へ変換する", () => {
    expect(
      migrateStateV3ToV4({
        schemaVersion: 3,
        logs: [
          { id: "legacy", status: "inbox" },
          {
            id: "future",
            status: "scheduled",
            focusArea: "future",
          },
        ],
      }),
    ).toMatchObject({
      schemaVersion: 4,
      logs: [
        {
          id: "legacy",
          status: "inbox",
          focusArea: "unset",
        },
        {
          id: "future",
          status: "inbox",
          focusArea: "unset",
        },
      ],
    });
  });

  it("V4のEventとTemplateを火曜始まりへ変換する", () => {
    expect(
      migrateStateV4ToV5(
        {
          schemaVersion: 4,
          events: [
            {
              id: "monday",
              date: "2026-06-29",
              day: 0,
              weekOffset: 0,
              status: "completed",
            },
          ],
          templates: [
            {
              id: "template",
              events: [
                { categoryId: "work", day: 0 },
                { categoryId: "meal", day: 1 },
              ],
            },
          ],
        },
        migrationDate,
      ),
    ).toMatchObject({
      schemaVersion: 5,
      events: [
        {
          id: "monday",
          day: 6,
          weekOffset: -1,
          status: "completed",
        },
      ],
      templates: [
        {
          events: [
            { categoryId: "work", day: 6 },
            { categoryId: "meal", day: 0 },
          ],
        },
      ],
    });
  });

  it("V5のLifeLogとEventを相互参照へ変換する", () => {
    expect(
      migrateStateV5ToV6({
        schemaVersion: 5,
        events: [
          {
            id: "scheduled-event",
            lifeLogId: "scheduled-log",
            status: "pending",
          },
          {
            id: "completed-event",
            status: "completed",
          },
        ],
        logs: [
          {
            id: "scheduled-log",
            status: "inbox",
            focusArea: "future",
          },
          {
            id: "completed-log",
            eventId: "completed-event",
            status: "scheduled",
            focusArea: "future",
          },
          {
            id: "missing-event-log",
            eventId: "missing",
            status: "scheduled",
            focusArea: "future",
          },
        ],
      }),
    ).toMatchObject({
      schemaVersion: 6,
      events: [
        {
          id: "scheduled-event",
          lifeLogId: "scheduled-log",
        },
        {
          id: "completed-event",
          lifeLogId: "completed-log",
        },
      ],
      logs: [
        {
          id: "scheduled-log",
          eventId: "scheduled-event",
          status: "scheduled",
        },
        {
          id: "completed-log",
          eventId: "completed-event",
          status: "done",
        },
        {
          id: "missing-event-log",
          status: "inbox",
        },
      ],
    });
  });

  it("V6の既存Eventへ通知なしを補完してV7へ変換する", () => {
    expect(
      migrateStateV6ToV7({
        schemaVersion: 6,
        events: [
          { id: "legacy-event" },
          { id: "notify-event", notificationMinutes: 10 },
          { id: "invalid-event", notificationMinutes: 5 },
        ],
      }),
    ).toMatchObject({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      events: [
        { id: "legacy-event", notificationMinutes: null },
        { id: "notify-event", notificationMinutes: 10 },
        { id: "invalid-event", notificationMinutes: null },
      ],
    });
  });

  it("V1 Stateを指定した基準週からV2へ変換する", () => {
    const migrated = migrateStateV1ToV2(
      {
        version: 1,
        schemaVersion: 1,
        events: [
          {
            id: "next-week-wednesday",
            day: 2,
            weekOffset: 1,
          },
        ],
      },
      new Date(2026, 5, 29, 12),
    );

    expect(migrated).toMatchObject({
      schemaVersion: 2,
      events: [
        {
          id: "next-week-wednesday",
          date: "2026-07-08",
        },
      ],
    });
  });

  it("schemaVersion: 1の保存データをV2 Migrationへ通す", () => {
    const migrated = migrateState(
      {
        version: 1,
        schemaVersion: 1,
        events: [
          {
            id: "current-week-sunday",
            day: 6,
            weekOffset: 0,
          },
        ],
      },
      migrationDate,
    );

    expect(migrated).toMatchObject({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      events: [
        {
          id: "current-week-sunday",
          date: "2026-07-05",
        },
      ],
    });
  });

  it("現在Versionのデータ内容を変更しない", () => {
    const state = {
      version: 1 as const,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      categories: [],
      events: [],
      templates: [],
    };

    expect(migrateState(state)).toEqual(state);
  });

  it("未対応のVersionを現在の形式として扱わない", () => {
    expect(migrateState({ schemaVersion: 8 })).toBeNull();
  });
});
