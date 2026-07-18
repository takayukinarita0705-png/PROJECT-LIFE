import { describe, expect, it } from "vitest";
import {
  createStudyTimeRecord,
  getMonthStudyMinutes,
  getStudyTimeSummary,
  getTodayStudyMinutes,
  getTotalStudyMinutes,
  getWeekStudyMinutes,
  isStudyCategory,
  mergeStudyTimeRecords,
  normalizeStudyTimeRecord,
} from "@/app/lib/studyTime";
import type { Category, StudyTimeRecord } from "@/app/types/calendar";

const studyCategory: Category = {
  id: "takken-law",
  name: "宅建業法",
  color: "#ef4444",
  icon: "📕",
  group: "study",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const workCategory: Category = {
  ...studyCategory,
  id: "work",
  name: "仕事",
  group: "work",
};

function createRecord(
  id: string,
  date: string,
  minutes: number,
): StudyTimeRecord {
  return {
    id,
    date,
    taskId: `${id}-task`,
    minutes,
    createdAt: `${date}T01:00:00.000Z`,
  };
}

describe("Study Time集計", () => {
  it("studyグループと宅建・勉強・学習カテゴリを勉強系として扱う", () => {
    expect(isStudyCategory(studyCategory)).toBe(true);
    expect(
      isStudyCategory({ ...workCategory, name: "資格の勉強" }),
    ).toBe(true);
    expect(
      isStudyCategory({ ...workCategory, name: "英語学習" }),
    ).toBe(true);
    expect(isStudyCategory(workCategory)).toBe(false);
  });

  it("保存済み記録から今日・今週・日別・継続日数を集計する", () => {
    const records = [
      createRecord("sun", "2026-07-12", 10),
      createRecord("mon", "2026-07-13", 10),
      createRecord("tue", "2026-07-14", 90),
      createRecord("wed", "2026-07-15", 60),
      createRecord("thu", "2026-07-16", 25),
      createRecord("fri", "2026-07-17", 120),
      createRecord("sat", "2026-07-18", 85),
    ];

    expect(
      getStudyTimeSummary(
        records,
        new Date(2026, 6, 18, 12),
      ),
    ).toMatchObject({
      todayMinutes: 85,
      weekMinutes: 380,
      streakDays: 7,
      nextStreakDays: 7,
      studiedToday: true,
      progressPercentage: 71,
      days: [
        { date: "2026-07-14", label: "火", minutes: 90 },
        { date: "2026-07-15", label: "水", minutes: 60 },
        { date: "2026-07-16", label: "木", minutes: 25 },
        { date: "2026-07-17", label: "金", minutes: 120 },
        { date: "2026-07-18", label: "土", minutes: 85 },
        { date: "2026-07-19", label: "日", minutes: 0 },
        { date: "2026-07-20", label: "月", minutes: 0 },
      ],
    });
  });

  it("今日が未記録なら昨日までの継続日数と今日達成時の日数を返す", () => {
    const summary = getStudyTimeSummary(
      [
        createRecord("yesterday", "2026-07-17", 60),
        createRecord("two-days-ago", "2026-07-16", 60),
      ],
      new Date(2026, 6, 18, 12),
    );

    expect(summary).toMatchObject({
      todayMinutes: 0,
      streakDays: 2,
      nextStreakDays: 3,
      studiedToday: false,
    });
  });

  it("今日・今週・今月・累計の再利用可能な集計APIを提供する", () => {
    const records = [
      createRecord("today", "2026-07-18", 85),
      createRecord("week", "2026-07-15", 60),
      createRecord("month", "2026-07-01", 30),
      createRecord("past", "2026-06-30", 120),
    ];
    const referenceDate = new Date(2026, 6, 18, 12);

    expect(getTodayStudyMinutes(records, referenceDate)).toBe(85);
    expect(getWeekStudyMinutes(records, referenceDate)).toBe(145);
    expect(getMonthStudyMinutes(records, referenceDate)).toBe(175);
    expect(getTotalStudyMinutes(records)).toBe(295);
  });

  it("保存レコードの形式を検証する", () => {
    const record = createRecord("valid", "2026-07-18", 45);
    expect(normalizeStudyTimeRecord(record)).toEqual(record);
    expect(normalizeStudyTimeRecord({ ...record, minutes: 0 })).toBeNull();
    expect(normalizeStudyTimeRecord({ ...record, date: "invalid" })).toBeNull();
    expect(
      createStudyTimeRecord(
        "task-1",
        "2026-07-18",
        45,
        "record-1",
        "2026-07-18T01:00:00.000Z",
      ),
    ).toEqual({
      id: "record-1",
      date: "2026-07-18",
      taskId: "task-1",
      minutes: 45,
      createdAt: "2026-07-18T01:00:00.000Z",
    });
  });

  it("端末間の記録をtaskIdで重複なく統合し、ローカル削除を復活させない", () => {
    const local = createRecord("local", "2026-07-18", 45);
    const remote = createRecord("remote", "2026-07-18", 60);
    expect(mergeStudyTimeRecords([local], [local, remote], new Set())).toEqual([
      local,
      remote,
    ]);
    expect(
      mergeStudyTimeRecords([], [remote], new Set([remote.taskId])),
    ).toEqual([]);
  });
});
