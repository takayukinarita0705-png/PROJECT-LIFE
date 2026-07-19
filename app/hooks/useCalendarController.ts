"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CATEGORIES,
  FREE_CATEGORY_ID,
  attachRoutineRelations,
  createFixedTemplateEvents,
  dateLabel,
  eventKey,
  filterEventsByDates,
  getWeekDates,
  ensureFreeCategory,
  mergeUniqueEvents,
  moveEventToNextDay,
  preserveRemoteEventStatuses,
  postponeEventToDate,
  reconcileTemplateEvents,
  normalizeNewEventTitle,
  resetEventStatus,
  toggleEventCompletion,
  toggleEventSkipped,
  WORKDAY_ROUTINE,
} from "@/app/lib/calendar";
import {
  addDaysToCalendarDate,
  formatCalendarDate,
  getEventEndDate,
  materializeEventDate,
  resolveEventDay,
  resolveEventDate,
} from "@/app/lib/date";
import {
  detachEventFromRoutine,
  runRoutineEngine,
} from "@/app/lib/engine/routineEngine";
import {
  areSharedCalendarStatesEqual,
  loadCachedCalendarState,
  saveCachedCalendarState,
  serializeSharedCalendarState,
} from "@/app/lib/calendarCache";
import { CURRENT_SCHEMA_VERSION } from "@/app/lib/migrations/calendarState";
import {
  loadSharedCalendarState,
  saveSharedCalendarState,
} from "@/app/lib/supabaseStorage";
import { parseTime } from "@/app/lib/time";
import {
  canScheduleLifeLog,
  createLifeLogFromEvent,
  createLifeLogScheduledEvent,
  getLifeLogForEvent,
  getLifeLogLinkDiagnostics,
  linkEventToLifeLog,
  markLifeLogAsScheduled,
  mergeLifeLogsPreservingLocalCompletion,
  normalizeLifeLogBody,
  reconcileLifeLogsWithScheduleStatuses,
  unlinkLifeLogFromEvent,
  unlinkEventFromLifeLog,
  updateLifeLogsForScheduleStatus,
} from "@/app/lib/lifeLogs";
import { completeEndedAutomaticEvents } from "@/app/lib/autoCompletion";
import {
  createStudyTimeRecord,
  DEFAULT_DAILY_STUDY_GOAL_MINUTES,
  editStudyTimeRecordMinutes,
  getJapanStudyDate,
  isStudyTask,
  mergeStudyTimeRecords,
  normalizeStudyDailyGoalMinutes,
  removeCompletionStudyTimeRecords,
  removeStudyTimeRecord,
  resolveStudyDuration,
  upsertStudyTimeRecord,
} from "@/app/lib/studyTime";
import type {
  CalendarEvent,
  CalendarTemplate,
  Category,
  CategoryDraft,
  Draft,
  EventEditDraft,
  SaveStatus,
  TemplateEvent,
  UndoSnapshot,
  SharedCalendarState,
  LifeLog,
  LifeLogFocusArea,
  LifeLogScheduleDetails,
  StudyTimeRecord,
} from "@/app/types/calendar";

function prepareSharedCalendarState(
  state: SharedCalendarState,
): SharedCalendarState {
  return {
    ...state,
    categories: ensureFreeCategory(state.categories),
    events: state.events,
    logs: reconcileLifeLogsWithScheduleStatuses(state.logs, state.events),
  };
}

export default function useCalendarController(weekOffset: number) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] =
    useState<Category[]>(DEFAULT_CATEGORIES);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);
  const [templates, setTemplates] = useState<CalendarTemplate[]>([]);
  const [logs, setLogs] = useState<LifeLog[]>([]);
  const [studyRecords, setStudyRecords] = useState<StudyTimeRecord[]>([]);
  const [studyDailyGoalMinutes, setStudyDailyGoalMinutes] = useState(
    DEFAULT_DAILY_STUDY_GOAL_MINUTES,
  );
  const [hasLoadedTemplates, setHasLoadedTemplates] = useState(false);
  const [hasCheckedLocalCache, setHasCheckedLocalCache] = useState(false);
  const [isSyncingSharedState, setIsSyncingSharedState] = useState(false);
  const [canPersistSharedState, setCanPersistSharedState] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const [syncRetryNonce, setSyncRetryNonce] = useState(0);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    WORKDAY_ROUTINE.workCategoryId,
  );
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(
    null,
  );
  const undoTimerRef = useRef<number | null>(null);
  const undoIdRef = useRef(0);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const currentSharedStateRef = useRef<SharedCalendarState | null>(null);
  const lastSyncedStateRef = useRef<string | null>(null);
  const locallyChangedStatusIdsRef = useRef(new Set<string>());
  const locallyChangedStudyTaskIdsRef = useRef(new Set<string>());

  const weekDates = getWeekDates(weekOffset);
  const weekDateKeys = new Set(
    weekDates.map(formatCalendarDate),
  );
  const activeCategoryId = categories.some(
    (category) => category.id === selectedCategoryId,
  )
    ? selectedCategoryId
    : categories[0]?.id ?? "";

  useEffect(() => {
    let cancelled = false;

    async function restoreSharedState() {
      const cachedState = loadCachedCalendarState();
      if (cachedState) {
        const preparedCache = prepareSharedCalendarState(cachedState);
        currentSharedStateRef.current = preparedCache;
        lastSyncedStateRef.current =
          serializeSharedCalendarState(preparedCache);
        setCategories(preparedCache.categories);
        setEvents(preparedCache.events);
        setTemplates(preparedCache.templates);
        setLogs(preparedCache.logs);
        setStudyRecords(preparedCache.studyRecords);
        setStudyDailyGoalMinutes(preparedCache.studyDailyGoalMinutes);
        setHasLoadedEvents(true);
        setHasLoadedTemplates(true);
      }
      setHasCheckedLocalCache(true);
      setIsSyncingSharedState(true);

      try {
        const loadedState = await loadSharedCalendarState();
        if (cancelled) return;

        const serializedRemoteState =
          serializeSharedCalendarState(loadedState);
        const inconsistentLinks = getLifeLogLinkDiagnostics(
          loadedState.logs,
          loadedState.events,
        ).filter(({ isInconsistent }) => isInconsistent);
        if (inconsistentLinks.length > 0) {
          console.warn(
            "完了予定とLifeLogの状態不整合を修復しました。",
            inconsistentLinks,
          );
        }
        const remoteState = prepareSharedCalendarState(loadedState);
        const currentState = currentSharedStateRef.current;
        const mergedLogs = currentState
          ? mergeLifeLogsPreservingLocalCompletion(
              currentState.logs,
              remoteState.logs,
            )
          : remoteState.logs;
        const completedEventIds = new Set(
          mergedLogs.flatMap((log) =>
            log.status === "done" && log.eventId ? [log.eventId] : [],
          ),
        );
        const localCompletedEvents = new Map(
          (currentState?.events ?? [])
            .filter(
              (event) =>
                event.status === "completed" &&
                completedEventIds.has(event.id),
            )
            .map((event) => [event.id, event]),
        );
        localCompletedEvents.forEach((event, id) => {
          const remoteEvent = remoteState.events.find((item) => item.id === id);
          if (remoteEvent?.status !== event.status) {
            locallyChangedStatusIdsRef.current.add(id);
          }
        });
        const mergedEvents = remoteState.events.map(
          (event) => localCompletedEvents.get(event.id) ?? event,
        );
        const remoteEventIds = new Set(
          remoteState.events.map((event) => event.id),
        );
        localCompletedEvents.forEach((event, id) => {
          if (!remoteEventIds.has(id)) mergedEvents.push(event);
        });
        const sharedState = {
          ...remoteState,
          events: mergedEvents,
          logs: mergedLogs,
        };

        lastSyncedStateRef.current = serializedRemoteState;
        saveCachedCalendarState(sharedState);
        if (
          currentState === null ||
          !areSharedCalendarStatesEqual(currentState, sharedState)
        ) {
          currentSharedStateRef.current = sharedState;
          setCategories(sharedState.categories);
          setEvents(sharedState.events);
          setTemplates(sharedState.templates);
          setLogs(sharedState.logs);
          setStudyRecords(sharedState.studyRecords);
          setStudyDailyGoalMinutes(sharedState.studyDailyGoalMinutes);
        }
        setCanPersistSharedState(true);
      } catch (error) {
        console.error("Supabaseから予定データを復元できませんでした。", error);
      } finally {
        if (cancelled) return;
        setIsSyncingSharedState(false);
        setHasLoadedEvents(true);
        setHasLoadedTemplates(true);
      }
    }

    void restoreSharedState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedEvents || !hasLoadedTemplates) {
      return;
    }

    const sharedState = {
      version: 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      categories,
      events,
      templates,
      logs,
      studyRecords,
      studyDailyGoalMinutes,
    } as const;
    const serializedState = serializeSharedCalendarState(sharedState);
    currentSharedStateRef.current = sharedState;
    saveCachedCalendarState(sharedState);

    if (
      !canPersistSharedState ||
      serializedState === lastSyncedStateRef.current
    ) {
      return;
    }

    let cancelled = false;
    let hideTimer: number | undefined;
    let retryTimer: number | undefined;
    const persistTimer = window.setTimeout(() => {
      setSaveStatus("saving");

      const persistSharedState = async () => {
        const remoteState = await loadSharedCalendarState();
        const mergedEvents = preserveRemoteEventStatuses(
          sharedState.events,
          remoteState.events,
          locallyChangedStatusIdsRef.current,
        );
        const stateToSave = {
          ...sharedState,
          events: mergedEvents,
          logs: reconcileLifeLogsWithScheduleStatuses(
            sharedState.logs,
            mergedEvents,
          ),
          studyRecords: mergeStudyTimeRecords(
            sharedState.studyRecords,
            remoteState.studyRecords,
            locallyChangedStudyTaskIdsRef.current,
          ),
        };
        await saveSharedCalendarState(stateToSave);
        return stateToSave;
      };
      const saveRequest = saveQueueRef.current.then(
        persistSharedState,
        persistSharedState,
      );
      saveQueueRef.current = saveRequest.catch(() => undefined);

      void saveRequest
        .then((savedState) => {
          if (cancelled) return;
          const savedSerializedState =
            serializeSharedCalendarState(savedState);
          lastSyncedStateRef.current = savedSerializedState;
          currentSharedStateRef.current = savedState;
          saveCachedCalendarState(savedState);
          setEvents((current) =>
            preserveRemoteEventStatuses(
              current,
              savedState.events,
              locallyChangedStatusIdsRef.current,
            ),
          );
          setLogs(savedState.logs);
          setStudyRecords(savedState.studyRecords);
          setSaveStatus("saved");
          hideTimer = window.setTimeout(() => setSaveStatus(null), 2000);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setSaveStatus("error");
          console.error("Supabaseへ予定データを保存できませんでした。", error);
          retryTimer = window.setTimeout(
            () => setSyncRetryNonce((current) => current + 1),
            5000,
          );
        });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(persistTimer);
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [
    canPersistSharedState,
    categories,
    events,
    hasLoadedEvents,
    hasLoadedTemplates,
    templates,
    logs,
    studyRecords,
    studyDailyGoalMinutes,
    syncRetryNonce,
  ]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  function showUndo(previousEvents: CalendarEvent[]) {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
    }

    undoIdRef.current += 1;
    setUndoSnapshot({
      id: undoIdRef.current,
      events: previousEvents,
    });
    undoTimerRef.current = window.setTimeout(() => {
      setUndoSnapshot(null);
      undoTimerRef.current = null;
    }, 5000);
  }

  function clearUndo() {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoSnapshot(null);
  }

  function undoLastOperation() {
    if (!undoSnapshot) return;
    const previousEvents = undoSnapshot.events;
    clearUndo();
    setEvents(previousEvents);
  }

  function syncLinkedLifeLogStatus(
    event: CalendarEvent,
    status: CalendarEvent["status"],
    completedAt?: string,
  ) {
    const updatedAt = completedAt ?? new Date().toISOString();
    const eventWithStatus = {
      ...event,
      status,
      ...(status === "completed" && completedAt ? { completedAt } : {}),
    };
    setLogs((current) =>
      updateLifeLogsForScheduleStatus(
        current,
        eventWithStatus,
        status,
        updatedAt,
      ),
    );
  }

  function unlinkLifeLogsFromEvents(deletedEvents: CalendarEvent[]) {
    if (deletedEvents.length === 0) return;

    const deletedEventIds = new Set(deletedEvents.map((event) => event.id));
    const deletedLifeLogIds = new Set(
      deletedEvents
        .map((event) => event.lifeLogId)
        .filter((id): id is string => typeof id === "string"),
    );
    const updatedAt = new Date().toISOString();
    setLogs((current) =>
      current.map((log) =>
        deletedLifeLogIds.has(log.id) ||
        (log.eventId !== undefined && deletedEventIds.has(log.eventId))
          ? unlinkLifeLogFromEvent(log, updatedAt)
          : log,
      ),
    );
  }

  function moveEvent(
    event: CalendarEvent,
    movedEvent: CalendarEvent,
    detachFromRoutine = false,
  ) {
    const datedMovedEvent = materializeEventDate(
      detachFromRoutine
        ? detachEventFromRoutine(movedEvent)
        : movedEvent,
    );
    const isDuplicate = events.some(
      (item) =>
        item.id !== event.id && eventKey(item) === eventKey(datedMovedEvent),
    );
    if (
      isDuplicate ||
      (resolveEventDate(event) === datedMovedEvent.date &&
        event.start === datedMovedEvent.start)
    ) {
      return;
    }

    showUndo(events);
    setEvents(runRoutineEngine(events, datedMovedEvent));
  }

  function addEvent(
    draft: Draft,
    categoryId = activeCategoryId,
    preserveTitle = false,
  ) {
    if (!categoryId) return null;
    const title = normalizeNewEventTitle(
      categoryId,
      draft.title,
    );
    const eventTitle = preserveTitle
      ? draft.title?.trim() || undefined
      : title ?? undefined;
    if (title === null || (preserveTitle && !eventTitle)) return null;

    const newEvent = materializeEventDate({
      id: crypto.randomUUID(),
      title: eventTitle,
      categoryId,
      mode: "fixed",
      status: "pending",
      linkType: "none",
      offsetMinutes: 0,
      date: draft.date,
      day: draft.day,
      start: draft.start,
      end: draft.end,
      endDate: draft.endDate,
      weekOffset: draft.weekOffset,
      lifeLogId: draft.lifeLogId,
      notificationMinutes: draft.notificationMinutes ?? null,
    });
    const nextEvents = mergeUniqueEvents(events, [newEvent]);

    if (nextEvents.length !== events.length) {
      showUndo(events);
      setEvents(nextEvents);
      return newEvent;
    }
    return null;
  }

  function deleteEvent(id: string) {
    const deletedEvents = events.filter((event) => event.id === id);
    const nextEvents = events.filter((event) => event.id !== id);
    if (nextEvents.length !== events.length) {
      showUndo(events);
      setEvents(nextEvents);
      unlinkLifeLogsFromEvents(deletedEvents);
    }
  }

  function toggleEventCompleted(id: string) {
    locallyChangedStatusIdsRef.current.add(id);
    const event = events.find((item) => item.id === id);
    if (event) {
      const isCompleting = event.status !== "completed";
      const completedAt = isCompleting ? new Date().toISOString() : undefined;
      syncLinkedLifeLogStatus(
        event,
        isCompleting ? "completed" : "pending",
        completedAt,
      );
      if (event.status === "completed") {
        locallyChangedStudyTaskIdsRef.current.add(id);
        setStudyRecords((current) =>
          removeCompletionStudyTimeRecords(current, id),
        );
      }
      setEvents((current) =>
        toggleEventCompletion(current, id, completedAt),
      );
      return;
    }
    setEvents((current) => toggleEventCompletion(current, id));
  }

  function toggleEventSkip(id: string) {
    locallyChangedStatusIdsRef.current.add(id);
    const event = events.find((item) => item.id === id);
    if (event) {
      syncLinkedLifeLogStatus(
        event,
        event.status === "skipped" ? "pending" : "skipped",
      );
    }
    setEvents((current) => toggleEventSkipped(current, id));
  }

  function resetEventToPending(id: string) {
    locallyChangedStatusIdsRef.current.add(id);
    const event = events.find((item) => item.id === id);
    if (event) syncLinkedLifeLogStatus(event, "pending");
    locallyChangedStudyTaskIdsRef.current.add(id);
    setStudyRecords((current) =>
      removeCompletionStudyTimeRecords(current, id),
    );
    setEvents((current) => resetEventStatus(current, id));
  }

  function completeStudyEvent(id: string, enteredMinutes?: number) {
    const event = events.find((item) => item.id === id);
    const category = event
      ? categories.find((item) => item.id === event.categoryId)
      : undefined;
    if (
      !event ||
      !category ||
      event.status === "completed" ||
      event.status === "skipped" ||
      !isStudyTask(event, category)
    ) {
      return {
        status: "error" as const,
        message: "この予定は勉強時間の記録対象ではありません。",
      };
    }

    const duration = resolveStudyDuration(event, enteredMinutes);
    if (!duration) return { status: "needs_input" as const };
    const createdAt = new Date().toISOString();
    const record = createStudyTimeRecord({
      id: `study-${event.id}-${duration.source}`,
      taskId: event.id,
      taskTitle: event.title?.trim() || category.name,
      categoryId: category.id,
      categoryName: category.name,
      studyDate: duration.studyDate ?? getJapanStudyDate(new Date(createdAt)),
      minutes: duration.minutes,
      source: duration.source,
      createdAt,
    });
    if (!record) {
      return {
        status: "error" as const,
        message: "勉強時間を保存できませんでした。もう一度お試しください。",
      };
    }
    locallyChangedStatusIdsRef.current.add(id);
    locallyChangedStudyTaskIdsRef.current.add(id);
    syncLinkedLifeLogStatus(event, "completed", createdAt);
    setStudyRecords((current) => upsertStudyTimeRecord(current, record));
    setEvents((current) =>
      current.map((item) =>
        item.id === id &&
        item.status !== "completed" &&
        item.status !== "skipped"
          ? {
              ...item,
              status: "completed" as const,
              completedAt: createdAt,
            }
          : item,
      ),
    );
    return { status: "completed" as const };
  }

  function saveStudyDailyGoal(minutes: number) {
    setStudyDailyGoalMinutes(normalizeStudyDailyGoalMinutes(minutes));
  }

  function updateStudyRecordMinutes(id: string, minutes: number) {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 24 * 60) {
      return false;
    }
    const record = studyRecords.find((item) => item.id === id);
    if (!record) return false;
    locallyChangedStudyTaskIdsRef.current.add(record.taskId);
    const updatedAt = new Date().toISOString();
    setStudyRecords((current) =>
      editStudyTimeRecordMinutes(current, id, minutes, updatedAt) ?? current,
    );
    return true;
  }

  function deleteStudyRecord(id: string) {
    const record = studyRecords.find((item) => item.id === id);
    if (!record) return false;
    locallyChangedStudyTaskIdsRef.current.add(record.taskId);
    setStudyRecords((current) =>
      removeStudyTimeRecord(current, id) ?? current,
    );
    return true;
  }

  const autoCompleteEndedEvents = useCallback(
    (now: Date) => {
      setEvents((current) => {
        const completed = completeEndedAutomaticEvents(
          current,
          categories,
          now,
        );
        if (completed === current) return current;

        completed.forEach((event, index) => {
          if (
            event.status === "completed" &&
            current[index]?.status !== "completed"
          ) {
            locallyChangedStatusIdsRef.current.add(event.id);
          }
        });
        return completed;
      });
    },
    [categories],
  );

  function moveEventToTomorrow(id: string) {
    locallyChangedStatusIdsRef.current.add(id);
    const event = events.find((item) => item.id === id);
    if (event) syncLinkedLifeLogStatus(event, "pending");
    showUndo(events);
    setEvents((current) => moveEventToNextDay(current, id));
  }

  function postponeEvent(id: string, targetDate: string) {
    const event = events.find((item) => item.id === id);
    if (!event) return false;
    const postponedEvent = postponeEventToDate(event, targetDate);
    if (postponedEvent === event) return false;

    showUndo(events);
    setEvents((current) =>
      current.map((item) =>
        item.id === id
          ? postponeEventToDate(item, targetDate)
          : item,
      ),
    );
    return true;
  }

  function saveEventEdit(
    draft: EventEditDraft,
    detachFromRoutine = false,
  ) {
    const start = parseTime(draft.start);
    const parsedEnd = parseTime(draft.end);
    const normalizedTitle = normalizeNewEventTitle(
      draft.categoryId,
      draft.title,
    );
    if (normalizedTitle === null) return "タイトルを入力してください。";
    const title =
      (normalizedTitle ?? draft.title.trim()) || undefined;
    const event = events.find((item) => item.id === draft.eventId);
    if (!event) return null;
    const eventDate = resolveEventDate(event);
    const end =
      start !== null &&
      parsedEnd !== null &&
      parsedEnd <= start &&
      event.endDate !== undefined &&
      event.endDate > eventDate
        ? parsedEnd + 24 * 60
        : parsedEnd;
    if (start === null || end === null) {
      return "開始・終了時刻を HH:MM 形式で正しく入力してください。";
    }
    if (end <= start) {
      return "終了時刻は開始時刻より後を選択してください。";
    }

    const editedEvent = materializeEventDate({
      ...event,
      title,
      categoryId: draft.categoryId,
      start,
      end,
      endDate: getEventEndDate(eventDate, end),
    });
    const eventToSave = detachFromRoutine
      ? detachEventFromRoutine(editedEvent)
      : editedEvent;
    const isDuplicate = events.some(
      (item) =>
        item.id !== event.id && eventKey(item) === eventKey(eventToSave),
    );
    if (isDuplicate) return "同じ時間に同じ予定がすでにあります。";

    showUndo(events);
    setEvents(runRoutineEngine(events, eventToSave));
    return null;
  }

  function createNextWeek() {
    clearUndo();
    const thisWeekEvents = filterEventsByDates(
      events,
      weekDates.map(formatCalendarDate),
    );
    const copied = attachRoutineRelations(
      thisWeekEvents.map((event) => ({
        ...event,
        id: crypto.randomUUID(),
        date: addDaysToCalendarDate(resolveEventDate(event), 7),
        endDate: event.endDate
          ? addDaysToCalendarDate(event.endDate, 7)
          : undefined,
        weekOffset: weekOffset + 1,
        status: "pending",
        linkedToEventId: undefined,
        linkType: "none",
        offsetMinutes: 0,
        lifeLogId: undefined,
        notificationMinutes: null,
        notificationSentAt: undefined,
        completedAt: undefined,
        routineDetached: undefined,
      })),
    );

    setEvents((previous) => mergeUniqueEvents(previous, copied));
  }

  function applyTemplate(
    templateEvents: TemplateEvent[],
    templateCategories: Category[],
  ) {
    clearUndo();
    const generatedEvents = attachRoutineRelations(
      templateEvents.map<CalendarEvent>((event) =>
        materializeEventDate({
          ...event,
          id: crypto.randomUUID(),
          date: formatCalendarDate(weekDates[event.day]),
          weekOffset,
          status: "pending",
          linkType: "none",
          offsetMinutes: 0,
          notificationMinutes: null,
          source: "fixed-template",
        }),
      ),
    );

    const requiredCategoryIds = new Set(
      templateEvents.map((event) => event.categoryId),
    );
    const missingCategories = templateCategories.filter(
      (category) =>
        requiredCategoryIds.has(category.id) &&
        !categories.some((item) => item.id === category.id),
    );
    if (missingCategories.length > 0) {
      setCategories((current) => [...current, ...missingCategories]);
    }

    setEvents((previous) => {
      const existingTemplateEvents = previous.filter(
        (event) =>
          weekDateKeys.has(resolveEventDate(event)) &&
          event.source === "fixed-template",
      );
      const nextEvents = reconcileTemplateEvents(
        existingTemplateEvents,
        generatedEvents,
      );
      const withoutCurrentTemplate = previous.filter(
        (event) =>
          !weekDateKeys.has(resolveEventDate(event)) ||
          event.source !== "fixed-template",
      );
      return mergeUniqueEvents(withoutCurrentTemplate, nextEvents);
    });
  }

  function applyFixedTemplate(secondDayOff: 0 | 2) {
    applyTemplate(createFixedTemplateEvents(secondDayOff), DEFAULT_CATEGORIES);
  }

  function saveCurrentWeekAsTemplate() {
    const currentWeekEvents = filterEventsByDates(
      events,
      weekDates.map(formatCalendarDate),
    );
    if (currentWeekEvents.length === 0) {
      window.alert("現在の週に保存できる予定がありません。");
      return;
    }

    const suggestedName = `${dateLabel(weekDates[0])}〜${dateLabel(weekDates[6])}`;
    const enteredName = window.prompt(
      "テンプレート名を入力してください",
      suggestedName,
    );
    const name = enteredName?.trim();
    if (!name) return;

    const templateEvents = currentWeekEvents.map<TemplateEvent>((event) => ({
      title: event.title,
      categoryId: event.categoryId,
      mode: event.mode,
      day: resolveEventDay(event),
      start: event.start,
      end: event.end,
      routineRelation: event.routineRelation,
    }));
    const requiredCategoryIds = new Set(
      templateEvents.map((event) => event.categoryId),
    );
    const templateCategories = categories
      .filter((category) => requiredCategoryIds.has(category.id))
      .map((category) => ({ ...category }));
    const createdAt = new Date().toISOString();

    setTemplates((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        description: "",
        events: templateEvents,
        categories: templateCategories,
        createdAt,
        updatedAt: createdAt,
      },
    ]);
  }

  function deleteTemplate(template: CalendarTemplate) {
    if (!window.confirm(`テンプレート「${template.name}」を削除しますか？`)) {
      return;
    }
    setTemplates((current) =>
      current.filter((item) => item.id !== template.id),
    );
  }

  function startAddingCategory() {
    setCategoryDraft({
      id: null,
      name: "",
      color: "#3b82f6",
      icon: "✨",
    });
  }

  function startEditingCategory(category: Category) {
    setCategoryDraft({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
    });
  }

  function saveCategory() {
    if (!categoryDraft) return;
    const name = categoryDraft.name.trim();
    const icon = categoryDraft.icon.trim() || "•";
    if (!name) return;

    if (categoryDraft.id) {
      setCategories((current) =>
        current.map((category) =>
          category.id === categoryDraft.id
            ? {
                ...category,
                name,
                color: categoryDraft.color,
                icon,
                updatedAt: new Date().toISOString(),
              }
            : category,
        ),
      );
    } else {
      const createdAt = new Date().toISOString();
      const category: Category = {
        id: `custom-${crypto.randomUUID()}`,
        name,
        color: categoryDraft.color,
        icon,
        group: "other",
        createdAt,
        updatedAt: createdAt,
      };
      setCategories((current) => [...current, category]);
      setSelectedCategoryId(category.id);
    }

    setCategoryDraft(null);
  }

  function deleteCategory(category: Category) {
    const relatedEventCount = events.filter(
      (event) => event.categoryId === category.id,
    ).length;
    const message =
      relatedEventCount > 0
        ? `「${category.name}」と、このカテゴリを使う予定${relatedEventCount}件を削除しますか？`
        : `「${category.name}」を削除しますか？`;

    if (!window.confirm(message)) return;

    clearUndo();
    setCategories((current) =>
      current.filter((item) => item.id !== category.id),
    );
    setEvents((current) =>
      current.filter((event) => event.categoryId !== category.id),
    );
    unlinkLifeLogsFromEvents(
      events.filter((event) => event.categoryId === category.id),
    );
    if (activeCategoryId === category.id) {
      const nextCategory = categories.find((item) => item.id !== category.id);
      setSelectedCategoryId(nextCategory?.id ?? "");
    }
    if (categoryDraft?.id === category.id) {
      setCategoryDraft(null);
    }
  }

  function saveWeeklyCategoryGoal(
    categoryId: string,
    weeklyGoalMinutes?: number,
  ) {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              weeklyGoalMinutes,
              updatedAt: new Date().toISOString(),
            }
          : category,
      ),
    );
  }

  function addLifeLog(
    body: string,
    focusArea: LifeLogFocusArea = "unset",
  ) {
    const normalizedBody = normalizeLifeLogBody(body);
    if (normalizedBody === null) return false;

    const createdAt = new Date().toISOString();
    const logId = crypto.randomUUID();
    setLogs((current) => [
      {
        id: logId,
        body: normalizedBody,
        status: "inbox",
        focusArea,
        createdAt,
        updatedAt: createdAt,
      },
      ...current,
    ]);
    return true;
  }

  function updateLifeLog(
    id: string,
    body: string,
    focusArea: LifeLogFocusArea,
    title?: string,
  ) {
    const normalizedBody = body.trim();
    const normalizedTitle = title?.trim();
    const existingLog = logs.find((log) => log.id === id);
    const effectiveTitle =
      title === undefined ? existingLog?.title : normalizedTitle;
    if (!normalizedBody && !effectiveTitle) return false;

    setLogs((current) =>
      current.map((log) =>
        log.id === id
          ? {
              ...log,
              body: normalizedBody,
              ...(title !== undefined
                ? { title: normalizedTitle || undefined }
                : {}),
              focusArea,
              updatedAt: new Date().toISOString(),
            }
          : log,
      ),
    );
    return true;
  }

  function addLifeLogFromEvent(
    eventId: string,
    title: string,
    body: string,
  ) {
    const event = events.find((item) => item.id === eventId);
    if (!event) return "予定が見つかりません。";
    if (getLifeLogForEvent(logs, event)) {
      return "この予定にはすでにライフログがあります。";
    }

    const createdAt = new Date().toISOString();
    const log = createLifeLogFromEvent(
      event,
      logs,
      title,
      body,
      crypto.randomUUID(),
      createdAt,
    );
    if (!log) return "タイトルを入力してください。";

    setLogs((current) => [log, ...current]);
    setEvents((current) =>
      current.map((item) =>
        item.id === eventId ? linkEventToLifeLog(item, log.id) : item,
      ),
    );
    return null;
  }

  function deleteLifeLog(id: string) {
    setEvents((current) =>
      current.map((event) =>
        unlinkEventFromLifeLog(event, id),
      ),
    );
    setLogs((current) => current.filter((log) => log.id !== id));
  }

  function scheduleLifeLog(
    id: string,
    title: string,
    details: LifeLogScheduleDetails,
  ) {
    const log = logs.find((item) => item.id === id);
    if (!log || !canScheduleLifeLog(log)) {
      return "このライフログはすでに予定化済みです。";
    }
    if (!categories.some((category) => category.id === FREE_CATEGORY_ID)) {
      return "フリーカテゴリが見つかりません。";
    }

    const event = createLifeLogScheduledEvent(
      log,
      title,
      details,
      crypto.randomUUID(),
    );
    if (!event) {
      return "予定の日時を正しく入力してください。";
    }
    const nextEvents = mergeUniqueEvents(events, [event]);
    if (nextEvents.length === events.length) {
      return "同じ時間にフリー予定がすでにあります。";
    }

    showUndo(events);
    setEvents(nextEvents);
    const updatedAt = new Date().toISOString();
    setLogs((current) =>
      current.map((log) =>
        log.id === id ? markLifeLogAsScheduled(log, updatedAt, event.id) : log,
      ),
    );
    return null;
  }

  return {
    activeCategoryId,
    autoCompleteEndedEvents,
    addLifeLogFromEvent,
    addLifeLog,
    addEvent,
    applyFixedTemplate,
    applyTemplate,
    categories,
    categoryDraft,
    completeStudyEvent,
    createNextWeek,
    deleteCategory,
    deleteEvent,
    deleteTemplate,
    deleteLifeLog,
    deleteStudyRecord,
    events,
    hasCheckedLocalCache,
    hasLoadedEvents,
    hasLoadedTemplates,
    isSyncingSharedState,
    logs,
    moveEvent,
    moveEventToTomorrow,
    postponeEvent,
    resetEventToPending,
    saveCategory,
    saveCurrentWeekAsTemplate,
    saveEventEdit,
    saveStatus,
    saveStudyDailyGoal,
    saveWeeklyCategoryGoal,
    scheduleLifeLog,
    setCategoryDraft,
    setSelectedCategoryId,
    startAddingCategory,
    startEditingCategory,
    studyRecords,
    studyDailyGoalMinutes,
    templates,
    toggleEventCompleted,
    toggleEventSkip,
    updateLifeLog,
    updateStudyRecordMinutes,
    undoLastOperation,
    undoSnapshot,
  };
}
