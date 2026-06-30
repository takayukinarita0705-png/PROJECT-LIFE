import { describe, expect, it } from "vitest";
import {
  DISPLAY_ROWS,
  displayRowToTimeRow,
  minutesFromDisplayStart,
} from "@/app/lib/time";

describe("05:00起点の時間変換", () => {
  it("先頭行を05:00、最終行を04:30として並べる", () => {
    expect(DISPLAY_ROWS[0]).toBe(10);
    expect(DISPLAY_ROWS.at(-1)).toBe(9);
  });

  it("23:30の次を00:00へ変換する", () => {
    expect(displayRowToTimeRow(37)).toBe(47);
    expect(displayRowToTimeRow(38)).toBe(0);
  });

  it("実時刻を05:00からの経過分へ変換する", () => {
    expect(minutesFromDisplayStart(5 * 60)).toBe(0);
    expect(minutesFromDisplayStart(0)).toBe(19 * 60);
    expect(minutesFromDisplayStart(4 * 60 + 59)).toBe(23 * 60 + 59);
  });
});
