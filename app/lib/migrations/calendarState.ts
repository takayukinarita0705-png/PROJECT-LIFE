import {
  getCalendarDayIndex,
  getDateFromWeekOffset,
  getWeekOffsetForDate,
  parseCalendarDate,
} from "@/app/lib/date";

export const CURRENT_SCHEMA_VERSION = 7 as const;
const LEGACY_SCHEMA_VERSION = 1;
const DATE_SCHEMA_VERSION = 2;
const LIFE_LOG_STATUS_SCHEMA_VERSION = 3;
const LIFE_LOG_FOCUS_SCHEMA_VERSION = 4;
const TUESDAY_WEEK_SCHEMA_VERSION = 5;
const LIFE_LOG_LINK_SCHEMA_VERSION = 6;

export type MigratableState = Record<string, unknown> & {
  schemaVersion?: unknown;
};

export type MigratedState = Record<string, unknown> & {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
};

export function migrateStateV1ToV2(
  state: MigratableState,
  anchorWeekStart: Date,
): MigratableState & { schemaVersion: typeof DATE_SCHEMA_VERSION } {
  const events = Array.isArray(state.events)
    ? state.events.map((value) => {
        if (typeof value !== "object" || value === null) return value;

        const event = value as Record<string, unknown>;
        if (
          typeof event.date === "string" ||
          typeof event.weekOffset !== "number" ||
          !Number.isInteger(event.weekOffset) ||
          typeof event.day !== "number" ||
          !Number.isInteger(event.day)
        ) {
          return event;
        }

        return {
          ...event,
          date: getDateFromWeekOffset(
            anchorWeekStart,
            event.weekOffset,
            event.day,
          ),
        };
      })
    : state.events;

  return {
    ...state,
    events,
    schemaVersion: DATE_SCHEMA_VERSION,
  };
}

export function migrateStateV2ToV3(
  state: MigratableState,
): MigratableState & {
  schemaVersion: typeof LIFE_LOG_STATUS_SCHEMA_VERSION;
} {
  const logs = Array.isArray(state.logs)
    ? state.logs.map((value) => {
        if (typeof value !== "object" || value === null) return value;

        const log = value as Record<string, unknown>;
        return {
          ...log,
          status:
            log.status === "inbox" ||
            log.status === "scheduled" ||
            log.status === "done"
              ? log.status
              : "inbox",
        };
      })
    : state.logs;

  return {
    ...state,
    logs,
    schemaVersion: LIFE_LOG_STATUS_SCHEMA_VERSION,
  };
}

export function migrateStateV3ToV4(
  state: MigratableState,
): MigratableState & {
  schemaVersion: typeof LIFE_LOG_FOCUS_SCHEMA_VERSION;
} {
  const logs = Array.isArray(state.logs)
    ? state.logs.map((value) => {
        if (typeof value !== "object" || value === null) return value;

        const log = value as Record<string, unknown>;
        return {
          ...log,
          status: "inbox",
          focusArea: "unset",
        };
      })
    : state.logs;

  return {
    ...state,
    logs,
    schemaVersion: LIFE_LOG_FOCUS_SCHEMA_VERSION,
  };
}

export function migrateStateV4ToV5(
  state: MigratableState,
  referenceDate = new Date(),
): MigratableState & {
  schemaVersion: typeof TUESDAY_WEEK_SCHEMA_VERSION;
} {
  const events = Array.isArray(state.events)
    ? state.events.map((value) => {
        if (typeof value !== "object" || value === null) return value;
        const event = value as Record<string, unknown>;
        const date =
          typeof event.date === "string"
            ? parseCalendarDate(event.date)
            : null;
        if (date) {
          return {
            ...event,
            day: getCalendarDayIndex(date),
            weekOffset: getWeekOffsetForDate(date, referenceDate),
          };
        }
        return typeof event.day === "number"
          ? { ...event, day: (event.day + 6) % 7 }
          : event;
      })
    : state.events;
  const templates = Array.isArray(state.templates)
    ? state.templates.map((value) => {
        if (typeof value !== "object" || value === null) return value;
        const template = value as Record<string, unknown>;
        if (!Array.isArray(template.events)) return template;
        return {
          ...template,
          events: template.events.map((eventValue) => {
            if (typeof eventValue !== "object" || eventValue === null) {
              return eventValue;
            }
            const event = eventValue as Record<string, unknown>;
            return typeof event.day === "number"
              ? { ...event, day: (event.day + 6) % 7 }
              : event;
          }),
        };
      })
    : state.templates;

  return {
    ...state,
    events,
    templates,
    schemaVersion: TUESDAY_WEEK_SCHEMA_VERSION,
  };
}

export function migrateStateV5ToV6(
  state: MigratableState,
): MigratableState & {
  schemaVersion: typeof LIFE_LOG_LINK_SCHEMA_VERSION;
} {
  const events = Array.isArray(state.events)
    ? state.events.map((value) =>
        typeof value === "object" && value !== null
          ? { ...(value as Record<string, unknown>) }
          : value,
      )
    : state.events;
  const logs = Array.isArray(state.logs)
    ? state.logs.map((value) =>
        typeof value === "object" && value !== null
          ? { ...(value as Record<string, unknown>) }
          : value,
      )
    : state.logs;

  if (!Array.isArray(events) || !Array.isArray(logs)) {
    return {
      ...state,
      events,
      logs,
      schemaVersion: LIFE_LOG_LINK_SCHEMA_VERSION,
    };
  }

  const eventById = new Map<string, Record<string, unknown>>();
  const eventByLifeLogId = new Map<string, Record<string, unknown>>();
  events.forEach((value) => {
    if (typeof value !== "object" || value === null) return;
    const event = value as Record<string, unknown>;
    if (typeof event.id === "string") eventById.set(event.id, event);
    if (typeof event.lifeLogId === "string") {
      eventByLifeLogId.set(event.lifeLogId, event);
    }
  });

  const linkedLogs = logs.map((value) => {
    if (typeof value !== "object" || value === null) return value;
    const log = value as Record<string, unknown>;
    if (typeof log.id !== "string") return log;

    const linkedEvent =
      (typeof log.eventId === "string"
        ? eventById.get(log.eventId)
        : undefined) ?? eventByLifeLogId.get(log.id);

    if (!linkedEvent || typeof linkedEvent.id !== "string") {
      return log.status === "scheduled" || log.status === "done"
        ? { ...log, status: "inbox", eventId: undefined }
        : log;
    }

    linkedEvent.lifeLogId = log.id;
    const eventStatus = linkedEvent.status;
    return {
      ...log,
      eventId: linkedEvent.id,
      status: eventStatus === "completed" ? "done" : "scheduled",
    };
  });

  return {
    ...state,
    events,
    logs: linkedLogs,
    schemaVersion: LIFE_LOG_LINK_SCHEMA_VERSION,
  };
}

export function migrateStateV6ToV7(
  state: MigratableState,
): MigratedState {
  const events = Array.isArray(state.events)
    ? state.events.map((value) => {
        if (typeof value !== "object" || value === null) return value;

        const event = value as Record<string, unknown>;
        return {
          ...event,
          notificationMinutes:
            event.notificationMinutes === 0 ||
            event.notificationMinutes === 10 ||
            event.notificationMinutes === 30 ||
            event.notificationMinutes === 60
              ? event.notificationMinutes
              : null,
        };
      })
    : state.events;

  return {
    ...state,
    events,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

// V1のdayは月曜始まりで保存されていたため、絶対日付へ直すまでは
// 旧基準を維持し、その後V4→V5で火曜始まりのdayへ変換する。
function getLegacyMondayAnchor(referenceDate: Date) {
  const anchorWeekStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
  );
  const currentDay = anchorWeekStart.getDay();
  anchorWeekStart.setDate(
    anchorWeekStart.getDate() + (currentDay === 0 ? -6 : 1 - currentDay),
  );
  return anchorWeekStart;
}

export function migrateState(
  state: MigratableState,
  referenceDate = new Date(),
): MigratedState | null {
  const schemaVersion =
    state.schemaVersion ?? LEGACY_SCHEMA_VERSION;

  if (schemaVersion === LEGACY_SCHEMA_VERSION) {
    return migrateStateV6ToV7(
      migrateStateV5ToV6(
        migrateStateV4ToV5(
          migrateStateV3ToV4(
            migrateStateV2ToV3(
              migrateStateV1ToV2(
                state,
                getLegacyMondayAnchor(referenceDate),
              ),
            ),
          ),
          referenceDate,
        ),
      ),
    );
  }
  if (schemaVersion === DATE_SCHEMA_VERSION) {
    return migrateStateV6ToV7(
      migrateStateV5ToV6(
        migrateStateV4ToV5(
          migrateStateV3ToV4(migrateStateV2ToV3(state)),
          referenceDate,
        ),
      ),
    );
  }
  if (schemaVersion === LIFE_LOG_STATUS_SCHEMA_VERSION) {
    return migrateStateV6ToV7(
      migrateStateV5ToV6(
        migrateStateV4ToV5(
          migrateStateV3ToV4(state),
          referenceDate,
        ),
      ),
    );
  }
  if (schemaVersion === LIFE_LOG_FOCUS_SCHEMA_VERSION) {
    return migrateStateV6ToV7(
      migrateStateV5ToV6(
        migrateStateV4ToV5(state, referenceDate),
      ),
    );
  }
  if (schemaVersion === TUESDAY_WEEK_SCHEMA_VERSION) {
    return migrateStateV6ToV7(migrateStateV5ToV6(state));
  }
  if (schemaVersion === LIFE_LOG_LINK_SCHEMA_VERSION) {
    return migrateStateV6ToV7(state);
  }
  if (schemaVersion !== CURRENT_SCHEMA_VERSION) return null;

  // TODO: schemaVersionが増えた際に段階的なMigration処理を追加する。
  return {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}
