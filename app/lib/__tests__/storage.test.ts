import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeCalendarEvent,
  normalizeCalendarTemplate,
  normalizeCategory,
} from "@/app/lib/storage";

const normalizedAt = "2026-07-01T00:00:00.000Z";

describe("旧データ補完処理", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(normalizedAt));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("旧Eventへmode・status・リンク情報の初期値を補完する", () => {
    const event = normalizeCalendarEvent({
      id: "legacy-event",
      categoryId: "work",
      day: 0,
      start: 9 * 60,
      end: 19 * 60,
      weekOffset: 0,
    });

    expect(event).toMatchObject({
      mode: "fixed",
      status: "pending",
      linkType: "none",
      offsetMinutes: 0,
    });
  });

  it("旧Categoryへgroupと作成・更新日時を補完する", () => {
    const category = normalizeCategory({
      id: "legacy-category",
      name: "旧カテゴリ",
      color: "#334155",
      icon: "📌",
    });

    expect(category).toMatchObject({
      group: "other",
      createdAt: normalizedAt,
      updatedAt: normalizedAt,
    });
  });

  it("旧Templateと内包データへ不足項目を補完する", () => {
    const template = normalizeCalendarTemplate({
      id: "legacy-template",
      name: "旧テンプレート",
      events: [
        {
          categoryId: "work",
          day: 0,
          start: 9 * 60,
          end: 19 * 60,
        },
      ],
      categories: [
        {
          id: "work",
          name: "仕事",
          color: "#3b82f6",
          icon: "💼",
        },
      ],
    });

    expect(template).toMatchObject({
      description: "",
      createdAt: normalizedAt,
      updatedAt: normalizedAt,
      events: [{ mode: "fixed" }],
      categories: [
        {
          group: "other",
          createdAt: normalizedAt,
          updatedAt: normalizedAt,
        },
      ],
    });
  });
});
