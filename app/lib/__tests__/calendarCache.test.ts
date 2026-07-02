import { describe, expect, it } from "vitest";
import {
  parseCachedCalendarState,
  serializeSharedCalendarState,
} from "@/app/lib/calendarCache";
import type { SharedCalendarState } from "@/app/types/calendar";

const state: SharedCalendarState = {
  version: 1,
  schemaVersion: 2,
  categories: [],
  events: [],
  templates: [],
};

describe("カレンダーのローカルキャッシュ", () => {
  it("保存した共有Stateを復元する", () => {
    expect(
      parseCachedCalendarState(serializeSharedCalendarState(state)),
    ).toEqual(state);
  });

  it("壊れたキャッシュを無視する", () => {
    expect(parseCachedCalendarState("{broken")).toBeNull();
    expect(parseCachedCalendarState(null)).toBeNull();
  });

  it("schemaVersionがないV1キャッシュをV2へ移行する", () => {
    const cachedV1 = JSON.stringify({
      version: 1,
      categories: [],
      events: [],
      templates: [],
    });

    expect(parseCachedCalendarState(cachedV1)?.schemaVersion).toBe(2);
  });
});
