import { DEFAULT_CATEGORIES } from "@/app/lib/calendar";
import {
  normalizeCategory,
  normalizeCalendarEvent,
  normalizeCalendarTemplate,
  normalizeLifeLog,
} from "@/app/lib/storage";
import {
  CURRENT_SCHEMA_VERSION,
  migrateState,
} from "@/app/lib/migrations/calendarState";
import { getSupabaseClient } from "@/app/lib/supabase";
import {
  DEFAULT_DAILY_STUDY_GOAL_MINUTES,
  normalizeStudyDailyGoalMinutes,
  normalizeStudyTimeRecord,
} from "@/app/lib/studyTime";
import type { SharedCalendarState } from "@/app/types/calendar";

const TABLE_NAME = "project_life_state";
const SHARED_STATE_ID = "default";
const SHARED_STATE_VERSION = 1;

function createEmptySharedState(): SharedCalendarState {
  return {
    version: SHARED_STATE_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    events: [],
    templates: [],
    logs: [],
    studyRecords: [],
    studyDailyGoalMinutes: DEFAULT_DAILY_STUDY_GOAL_MINUTES,
  };
}

function hasNoNull<T>(values: (T | null)[]): values is T[] {
  return values.every((value) => value !== null);
}

export function normalizeSharedCalendarState(
  value: unknown,
): SharedCalendarState | null {
  if (typeof value !== "object" || value === null) return null;

  const state = migrateState(value as Record<string, unknown>);
  if (!state) return null;

  if (
    state.version !== SHARED_STATE_VERSION ||
    !Array.isArray(state.categories) ||
    !Array.isArray(state.events) ||
    !Array.isArray(state.templates)
  ) {
    return null;
  }

  const categories = state.categories.map(normalizeCategory);
  const events = state.events.map(normalizeCalendarEvent);
  const templates = state.templates.map(normalizeCalendarTemplate);
  const logs = Array.isArray(state.logs)
    ? state.logs.map(normalizeLifeLog)
    : [];
  const studyRecords = Array.isArray(state.studyRecords)
    ? state.studyRecords.map(normalizeStudyTimeRecord)
    : [];
  if (
    !hasNoNull(categories) ||
    !hasNoNull(events) ||
    !hasNoNull(templates) ||
    !hasNoNull(logs) ||
    !hasNoNull(studyRecords)
  ) {
    return null;
  }
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const enrichedStudyRecords = studyRecords.map((record) => {
    const event = eventsById.get(record.taskId);
    const category = event
      ? categoriesById.get(event.categoryId)
      : undefined;
    const taskTitle =
      record.taskTitle || event?.title?.trim() || category?.name;
    const categoryId = record.categoryId ?? category?.id;
    const categoryName = record.categoryName ?? category?.name;
    return {
      ...record,
      ...(taskTitle ? { taskTitle } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(categoryName ? { categoryName } : {}),
    };
  });

  return {
    version: SHARED_STATE_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    categories,
    events,
    templates,
    logs,
    studyRecords: enrichedStudyRecords,
    studyDailyGoalMinutes: normalizeStudyDailyGoalMinutes(
      state.studyDailyGoalMinutes,
    ),
  };
}

export async function loadSharedCalendarState() {
  const { data, error } = await getSupabaseClient()
    .from(TABLE_NAME)
    .select("state")
    .eq("id", SHARED_STATE_ID)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Supabaseから予定を読み込めませんでした。${error.message}`,
    );
  }

  if (!data) return createEmptySharedState();

  const state = normalizeSharedCalendarState(data.state);
  if (!state) {
    throw new Error("Supabaseの予定データ形式が正しくありません。");
  }

  return state;
}

export async function saveSharedCalendarState(
  state: SharedCalendarState,
) {
  const { error } = await getSupabaseClient()
    .from(TABLE_NAME)
    .upsert(
      {
        id: SHARED_STATE_ID,
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    throw new Error(
      `Supabaseへ予定を保存できませんでした。${error.message}`,
    );
  }
}
