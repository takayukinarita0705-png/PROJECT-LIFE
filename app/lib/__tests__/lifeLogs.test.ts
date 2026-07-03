import { describe, expect, it } from "vitest";
import {
  normalizeLifeLogBody,
  sortLifeLogsNewestFirst,
} from "@/app/lib/lifeLogs";
import { normalizeLifeLog } from "@/app/lib/storage";
import type { LifeLog } from "@/app/types/calendar";

const olderLog: LifeLog = {
  id: "older",
  body: "古いログ",
  createdAt: "2026-07-01T01:00:00.000Z",
  updatedAt: "2026-07-01T01:00:00.000Z",
};

const newerLog: LifeLog = {
  id: "newer",
  body: "新しいログ",
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
    expect(normalizeLifeLog({ ...olderLog, body: "  記録  " })).toEqual({
      ...olderLog,
      body: "記録",
    });
    expect(normalizeLifeLog({ ...olderLog, createdAt: "invalid" })).toBeNull();
  });
});
