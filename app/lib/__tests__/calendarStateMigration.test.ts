import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  migrateState,
  migrateStateV1ToV2,
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
      schemaVersion: CURRENT_SCHEMA_VERSION,
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
    expect(migrateState({ schemaVersion: 3 })).toBeNull();
  });
});
