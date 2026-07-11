"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_CATEGORIES,
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
  markLifeLogAsScheduled,
  normalizeLifeLogBody,
} from "@/app/lib/lifeLogs";
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
} from "@/app/types/calendar";

function prepareSharedCalendarState(
  state: SharedCalendarState,
): SharedCalendarState {
  return {
    ...state,
    categories: ensureFreeCategory(state.categories),
    events: state.events,
  };
}

export default function useCalendarController(weekOffset: number) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] =
    useState<Category[]>(DEFAULT_CATEGORIES);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);
  const [templates, setTemplates] = useState<CalendarTemplate[]>([]);
  const [logs, setLogs] = useState<LifeLog[]>([]);
  const [hasLoadedTemplates, setHasLoadedTemplates] = useState(false);
  const [hasCheckedLocalCache, setHasCheckedLocalCache] = useState(false);
  const [isSyncingSharedState, setIsSyncingSharedState] = useState(false);
  const [canPersistSharedState, setCanPersistSharedState] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
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
        setHasLoadedEvents(true);
        setHasLoadedTemplates(true);
      }
      setHasCheckedLocalCache(true);
      setIsSyncingSharedState(true);

      try {
        const loadedState = await loadSharedCalendarState();
        if (cancelled) return;

        const sharedState = prepareSharedCalendarState(loadedState);
        const serializedState =
          serializeSharedCalendarState(sharedState);
        const currentState = currentSharedStateRef.current;

        lastSyncedStateRef.current = serializedState;
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
    const persistTimer = window.setTimeout(() => {
      setSaveStatus("saving");

      const persistSharedState = async () => {
        const remoteState = await loadSharedCalendarState();
        const stateToSave = {
          ...sharedState,
          events: preserveRemoteEventStatuses(
            sharedState.events,
            remoteState.events,
            locallyChangedStatusIdsRef.current,
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
          setSaveStatus("saved");
          hideTimer = window.setTimeout(() => setSaveStatus(null), 2000);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setSaveStatus(null);
          console.error("Supabaseへ予定データを保存できませんでした。", error);
        });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(persistTimer);
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    };
  }, [
    canPersistSharedState,
    categories,
    events,
    hasLoadedEvents,
    hasLoadedTemplates,
    templates,
    logs,
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
    if (!categoryId) return false;
    const title = normalizeNewEventTitle(
      categoryId,
      draft.title,
    );
    const eventTitle = preserveTitle
      ? draft.title?.trim() || undefined
      : title ?? undefined;
    if (title === null || (preserveTitle && !eventTitle)) return false;

    const nextEvents = mergeUniqueEvents(events, [
      materializeEventDate({
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
        weekOffset: draft.weekOffset,
        lifeLogId: draft.lifeLogId,
      }),
    ]);

    if (nextEvents.length !== events.length) {
      showUndo(events);
      setEvents(nextEvents);
      return true;
    }
    return false;
  }

  function deleteEvent(id: string) {
    const nextEvents = events.filter((event) => event.id !== id);
    if (nextEvents.length !== events.length) {
      showUndo(events);
      setEvents(nextEvents);
    }
  }

  function toggleEventCompleted(id: string) {
    locallyChangedStatusIdsRef.current.add(id);
    setEvents((current) => toggleEventCompletion(current, id));
  }

  function toggleEventSkip(id: string) {
    locallyChangedStatusIdsRef.current.add(id);
    setEvents((current) => toggleEventSkipped(current, id));
  }

  function resetEventToPending(id: string) {
    locallyChangedStatusIdsRef.current.add(id);
    setEvents((current) => resetEventStatus(current, id));
  }

  function moveEventToTomorrow(id: string) {
    locallyChangedStatusIdsRef.current.add(id);
    showUndo(events);
    setEvents((current) => moveEventToNextDay(current, id));
  }

  function saveEventEdit(
    draft: EventEditDraft,
    detachFromRoutine = false,
  ) {
    const start = parseTime(draft.start);
    const end = parseTime(draft.end);
    const normalizedTitle = normalizeNewEventTitle(
      draft.categoryId,
      draft.title,
    );
    if (normalizedTitle === null) return "タイトルを入力してください。";
    const title =
      (normalizedTitle ?? draft.title.trim()) || undefined;
    if (start === null || end === null || end <= start) {
      return "開始・終了時刻を HH:MM 形式で正しく入力してください。";
    }

    const event = events.find((item) => item.id === draft.eventId);
    if (!event) return null;

    const editedEvent = materializeEventDate({
      ...event,
      title,
      categoryId: draft.categoryId,
      start,
      end,
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
        weekOffset: weekOffset + 1,
        status: "pending",
        linkedToEventId: undefined,
        linkType: "none",
        offsetMinutes: 0,
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
    eventId?: string,
    focusArea: LifeLogFocusArea = "unset",
  ) {
    const normalizedBody = normalizeLifeLogBody(body);
    if (normalizedBody === null) return false;

    const createdAt = new Date().toISOString();
    setLogs((current) => [
      {
        id: crypto.randomUUID(),
        body: normalizedBody,
        status: "inbox",
        focusArea,
        eventId: eventId || undefined,
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
    eventId: string | undefined,
    focusArea: LifeLogFocusArea,
  ) {
    const normalizedBody = normalizeLifeLogBody(body);
    if (normalizedBody === null) return false;

    setLogs((current) =>
      current.map((log) =>
        log.id === id
          ? {
              ...log,
              body: normalizedBody,
              focusArea,
              eventId: eventId || undefined,
              updatedAt: new Date().toISOString(),
            }
          : log,
      ),
    );
    return true;
  }

  function deleteLifeLog(id: string) {
    setLogs((current) => current.filter((log) => log.id !== id));
  }

  function markLifeLogScheduled(id: string) {
    const updatedAt = new Date().toISOString();
    setLogs((current) =>
      current.map((log) =>
        log.id === id ? markLifeLogAsScheduled(log, updatedAt) : log,
      ),
    );
  }

  return {
    activeCategoryId,
    addLifeLog,
    addEvent,
    applyFixedTemplate,
    applyTemplate,
    categories,
    categoryDraft,
    createNextWeek,
    deleteCategory,
    deleteEvent,
    deleteTemplate,
    deleteLifeLog,
    events,
    hasCheckedLocalCache,
    hasLoadedEvents,
    hasLoadedTemplates,
    isSyncingSharedState,
    logs,
    markLifeLogScheduled,
    moveEvent,
    moveEventToTomorrow,
    resetEventToPending,
    saveCategory,
    saveCurrentWeekAsTemplate,
    saveEventEdit,
    saveStatus,
    saveWeeklyCategoryGoal,
    setCategoryDraft,
    setSelectedCategoryId,
    startAddingCategory,
    startEditingCategory,
    templates,
    toggleEventCompleted,
    toggleEventSkip,
    updateLifeLog,
    undoLastOperation,
    undoSnapshot,
  };
}
