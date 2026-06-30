import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  migrateState,
} from "@/app/lib/migrations/calendarState";

describe("保存StateのSchema Migration", () => {
  it("schemaVersionがない旧データをVersion 1として扱う", () => {
    const migrated = migrateState({
      version: 1,
      categories: [],
      events: [],
      templates: [],
    });

    expect(migrated?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("Version 1のデータ内容を変更しない", () => {
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
    expect(migrateState({ schemaVersion: 2 })).toBeNull();
  });
});
