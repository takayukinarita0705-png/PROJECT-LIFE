"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_CATEGORIES,
  attachRoutineRelations,
  createFixedTemplateEvents,
  dateLabel,
  eventKey,
  getWeekDates,
  mergeUniqueEvents,
  updateRoutineManually,
} from "@/app/lib/calendar";
import {
  addDaysToCalendarDate,
  formatCalendarDate,
} from "@/app/lib/date";
import { runRoutineEngine } from "@/app/lib/engine/routineEngine";
import { CURRENT_SCHEMA_VERSION } from "@/app/lib/migrations/calendarState";
import {
  loadSharedCalendarState,
  saveSharedCalendarState,
} from "@/app/lib/supabaseStorage";
import { parseTime } from "@/app/lib/time";
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
} from "@/app/types/calendar";

export default function useCalendarController(weekOffset: number) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] =
    useState<Category[]>(DEFAULT_CATEGORIES);
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);
  const [templates, setTemplates] = useState<CalendarTemplate[]>([]);
  const [hasLoadedTemplates, setHasLoadedTemplates] = useState(false);
  const [canPersistSharedState, setCanPersistSharedState] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("work");
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(
    null,
  );
  const undoTimerRef = useRef<number | null>(null);
  const undoIdRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const weekDates = getWeekDates(weekOffset);
  const weekDateKeys = new Set(weekDates.map(formatCalendarDate));
  const activeCategoryId = categories.some(
    (category) => category.id === selectedCategoryId,
  )
    ? selectedCategoryId
    : categories[0]?.id ?? "";

  useEffect(() => {
    let cancelled = false;

    async function restoreSharedState() {
      try {
        const sharedState = await loadSharedCalendarState();
        if (cancelled) return;

        setCategories(sharedState.categories);
        setEvents(attachRoutineRelations(sharedState.events));
        setTemplates(sharedState.templates);
        setCanPersistSharedState(true);
      } catch (error) {
        console.error("Supabaseから予定データを復元できませんでした。", error);
      } finally {
        if (cancelled) return;
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
    if (
      !hasLoadedEvents ||
      !hasLoadedTemplates ||
      !canPersistSharedState
    ) {
      return;
    }

    let cancelled = false;
    let hideTimer: number | undefined;
    const persistTimer = window.setTimeout(() => {
      setSaveStatus("saving");

      const sharedState = {
        version: 1,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        categories,
        events,
        templates,
      } as const;
      const saveRequest = saveQueueRef.current.then(
        () => saveSharedCalendarState(sharedState),
        () => saveSharedCalendarState(sharedState),
      );
      saveQueueRef.current = saveRequest.catch(() => undefined);

      void saveRequest
        .then(() => {
          if (cancelled) return;
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
  ) {
    const isDuplicate = events.some(
      (item) =>
        item.id !== event.id && eventKey(item) === eventKey(movedEvent),
    );
    if (
      isDuplicate ||
      (event.date === movedEvent.date &&
        event.start === movedEvent.start)
    ) {
      return;
    }

    showUndo(events);
    if (event.categoryId === "work" && event.mode === "fixed") {
      setEvents(runRoutineEngine(events, event, movedEvent));
    } else if (event.routineRelation) {
      setEvents(updateRoutineManually(events, event, movedEvent));
    } else {
      setEvents(
        events.map((item) =>
          item.id === event.id ? movedEvent : item,
        ),
      );
    }
  }

  function addEvent(draft: Draft) {
    if (!activeCategoryId) return;

    const nextEvents = mergeUniqueEvents(events, [
      {
        id: crypto.randomUUID(),
        categoryId: activeCategoryId,
        mode: "fixed",
        status: "pending",
        linkType: "none",
        offsetMinutes: 0,
        date: draft.date,
        day: draft.day,
        start: draft.start,
        end: draft.end,
        weekOffset: draft.weekOffset,
      },
    ]);

    if (nextEvents.length !== events.length) {
      showUndo(events);
      setEvents(attachRoutineRelations(nextEvents));
    }
  }

  function deleteEvent(id: string) {
    const deletedEvent = events.find((event) => event.id === id);
    let nextEvents = events.filter((event) => event.id !== id);
    if (deletedEvent?.routineRelation) {
      nextEvents = nextEvents.map((event) =>
        event.categoryId === "work" &&
        event.date === deletedEvent.date
          ? { ...event, routineDetached: true }
          : event,
      );
    }
    if (nextEvents.length !== events.length) {
      showUndo(events);
      setEvents(nextEvents);
    }
  }

  function saveEventEdit(draft: EventEditDraft) {
    const start = parseTime(draft.start);
    const end = parseTime(draft.end);
    const title = draft.title.trim();
    if (!title) return "タイトルを入力してください。";
    if (start === null || end === null || end <= start) {
      return "開始・終了時刻を HH:MM 形式で正しく入力してください。";
    }

    const event = events.find((item) => item.id === draft.eventId);
    if (!event) return null;

    const editedEvent: CalendarEvent = {
      ...event,
      title,
      categoryId: draft.categoryId,
      start,
      end,
    };
    const isDuplicate = events.some(
      (item) =>
        item.id !== event.id && eventKey(item) === eventKey(editedEvent),
    );
    if (isDuplicate) return "同じ時間に同じ予定がすでにあります。";

    showUndo(events);
    if (
      event.categoryId === "work" &&
      editedEvent.categoryId === "work" &&
      event.mode === "fixed" &&
      editedEvent.mode === "fixed" &&
      (event.start !== editedEvent.start || event.end !== editedEvent.end)
    ) {
      setEvents(runRoutineEngine(events, event, editedEvent));
    } else if (event.routineRelation) {
      setEvents(updateRoutineManually(events, event, editedEvent));
    } else {
      setEvents(
        events.map((item) =>
          item.id === event.id ? editedEvent : item,
        ),
      );
    }
    return null;
  }

  function createNextWeek() {
    clearUndo();
    const thisWeekEvents = events.filter(
      (event) => weekDateKeys.has(event.date),
    );
    const copied = attachRoutineRelations(
      thisWeekEvents.map((event) => ({
        ...event,
        id: crypto.randomUUID(),
        date: addDaysToCalendarDate(event.date, 7),
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
    const nextEvents = attachRoutineRelations(
      templateEvents.map<CalendarEvent>((event) => ({
        ...event,
        id: crypto.randomUUID(),
        date: formatCalendarDate(weekDates[event.day]),
        weekOffset,
        status: "pending",
        linkType: "none",
        offsetMinutes: 0,
        source: "fixed-template",
      })),
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
      const withoutCurrentTemplate = previous.filter(
        (event) =>
          !weekDateKeys.has(event.date) ||
          event.source !== "fixed-template",
      );
      return mergeUniqueEvents(withoutCurrentTemplate, nextEvents);
    });
  }

  function applyFixedTemplate(secondDayOff: 1 | 3) {
    applyTemplate(createFixedTemplateEvents(secondDayOff), DEFAULT_CATEGORIES);
  }

  function saveCurrentWeekAsTemplate() {
    const currentWeekEvents = events.filter(
      (event) => weekDateKeys.has(event.date),
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
      day: event.day,
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

  return {
    activeCategoryId,
    addEvent,
    applyFixedTemplate,
    applyTemplate,
    categories,
    categoryDraft,
    createNextWeek,
    deleteCategory,
    deleteEvent,
    deleteTemplate,
    events,
    hasLoadedEvents,
    hasLoadedTemplates,
    moveEvent,
    saveCategory,
    saveCurrentWeekAsTemplate,
    saveEventEdit,
    saveStatus,
    setCategoryDraft,
    setSelectedCategoryId,
    startAddingCategory,
    startEditingCategory,
    templates,
    undoLastOperation,
    undoSnapshot,
  };
}
