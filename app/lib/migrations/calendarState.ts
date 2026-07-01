import { getCalendarDateForWeekDay } from "@/app/lib/date";

export const CURRENT_SCHEMA_VERSION = 2 as const;
const LEGACY_SCHEMA_VERSION = 1;

export type MigratableState = Record<string, unknown> & {
  schemaVersion?: unknown;
};

export type MigratedState = Record<string, unknown> & {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
};

function migrateVersion1(
  state: MigratableState,
  referenceDate: Date,
): MigratedState {
  const events = Array.isArray(state.events)
    ? state.events.map((value) => {
        if (typeof value !== "object" || value === null) return value;

        const event = value as Record<string, unknown>;
        if (typeof event.date === "string") return event;
        if (
          typeof event.weekOffset !== "number" ||
          !Number.isInteger(event.weekOffset) ||
          typeof event.day !== "number" ||
          !Number.isInteger(event.day)
        ) {
          return event;
        }

        return {
          ...event,
          date: getCalendarDateForWeekDay(
            event.weekOffset,
            event.day,
            referenceDate,
          ),
        };
      })
    : state.events;

  return {
    ...state,
    events,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

export function migrateState(
  state: MigratableState,
  referenceDate = new Date(),
): MigratedState | null {
  const schemaVersion =
    state.schemaVersion ?? LEGACY_SCHEMA_VERSION;

  if (schemaVersion === LEGACY_SCHEMA_VERSION) {
    return migrateVersion1(state, referenceDate);
  }
  if (schemaVersion !== CURRENT_SCHEMA_VERSION) return null;

  // TODO: schemaVersionが増えた際に段階的なMigration処理を追加する。
  return {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}
