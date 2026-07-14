import { useState } from "react";
import { DAYS, FREE_CATEGORY_ID } from "@/app/lib/calendar";
import {
  getLifeLogScheduleTiming,
  LIFE_LOG_SCHEDULE_DURATION_OPTIONS,
} from "@/app/lib/lifeLogs";
import { formatTime } from "@/app/lib/time";
import type {
  Category,
  Draft,
  EventEditDraft,
  LifeLog,
  LifeLogScheduleDetails,
  LifeLogScheduleDuration,
} from "@/app/types/calendar";

export type EventDialogScheduleDetails = LifeLogScheduleDetails;

type EventDialogProps = {
  draft: Draft;
  categories: Category[];
  activeCategoryId: string;
  requiresScheduleDetails?: boolean;
  showsNotificationSetting?: boolean;
  error?: string;
  onCategoryChange: (categoryId: string) => void;
  onTitleChange: (title: string) => void;
  onCancel: () => void;
  onAdd: (details?: EventDialogScheduleDetails) => void;
};

export default function EventDialog({
  draft,
  categories,
  activeCategoryId,
  requiresScheduleDetails = false,
  showsNotificationSetting = false,
  error = "",
  onCategoryChange,
  onTitleChange,
  onCancel,
  onAdd,
}: EventDialogProps) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] =
    useState<LifeLogScheduleDuration>(30);
  const [customEnd, setCustomEnd] = useState("");
  const [notificationMinutes, setNotificationMinutes] = useState<
    number | null
  >(null);
  const scheduleTiming = requiresScheduleDetails
    ? getLifeLogScheduleTiming(date, start, duration, customEnd)
    : null;
  const hasRequiredCategory = requiresScheduleDetails
    ? categories.some((category) => category.id === FREE_CATEGORY_ID)
    : categories.length > 0 && Boolean(activeCategoryId);
  const hasValidScheduleDetails =
    !requiresScheduleDetails || scheduleTiming !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-xl font-bold text-slate-900">予定を追加</h3>
        {requiresScheduleDetails ? (
          <div className="mt-4 grid gap-3">
            <label className="block text-sm font-bold text-slate-700">
              日付
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border p-3 text-slate-900"
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              開始時間
              <input
                type="time"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border p-3 text-slate-900"
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              所要時間
              <select
                aria-label="所要時間"
                value={duration}
                onChange={(event) => {
                  const value = event.target.value;
                  setDuration(
                    value === "custom"
                      ? "custom"
                      : (Number(value) as Exclude<
                          LifeLogScheduleDuration,
                          "custom"
                        >),
                  );
                }}
                className="mt-1 min-h-11 w-full rounded-xl border p-3 text-slate-900"
              >
                {LIFE_LOG_SCHEDULE_DURATION_OPTIONS.map(
                  ({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>
            {duration === "custom" && (
              <label className="block text-sm font-bold text-slate-700">
                終了時間（カスタム）
                <input
                  type="time"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border p-3 text-slate-900"
                />
              </label>
            )}
            {scheduleTiming && scheduleTiming.endDate !== date && (
              <p className="text-xs font-bold text-amber-700">
                終了は翌日 {formatTime(scheduleTiming.end)} です
              </p>
            )}
            {showsNotificationSetting && (
              <label className="block text-sm font-bold text-slate-700">
                通知
                <select
                  value={notificationMinutes ?? "none"}
                  onChange={(event) => {
                    const value = event.target.value;
                    setNotificationMinutes(
                      value === "none" ? null : Number(value),
                    );
                  }}
                  className="mt-1 min-h-11 w-full rounded-xl border p-3 text-slate-900"
                >
                  <option value="none">通知なし</option>
                  <option value="0">開始時刻</option>
                  <option value="10">10分前</option>
                  <option value="30">30分前</option>
                  <option value="60">1時間前</option>
                </select>
              </label>
            )}
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            {DAYS[draft.day]}曜日 {formatTime(draft.start)}〜
            {formatTime(draft.end)}
          </p>
        )}

        {!requiresScheduleDetails && (
          <>
            <label className="mt-4 block text-sm font-bold text-slate-700">
              予定
            </label>
            <select
              value={activeCategoryId}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="mt-1 w-full rounded-xl border p-3 text-slate-900"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </>
        )}

        {(requiresScheduleDetails ||
          activeCategoryId === FREE_CATEGORY_ID) && (
          <>
            <label className="mt-4 block text-sm font-bold text-slate-700">
              予定名
            </label>
            <input
              value={draft.title ?? ""}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="予定名を入力"
              autoFocus
              className="mt-1 w-full rounded-xl border p-3 text-slate-900"
            />
          </>
        )}

        {!hasRequiredCategory && (
          <p className="mt-2 text-sm text-red-600">
            {requiresScheduleDetails
              ? "フリーカテゴリが見つかりません。"
              : "先にカテゴリ管理からカテゴリを追加してください。"}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-sm font-bold text-red-600">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border py-3 font-bold text-slate-700"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onAdd(
                requiresScheduleDetails && scheduleTiming
                  ? { ...scheduleTiming, notificationMinutes }
                  : undefined,
              );
            }}
            disabled={
              !hasRequiredCategory ||
              !hasValidScheduleDetails ||
              ((requiresScheduleDetails ||
                activeCategoryId === FREE_CATEGORY_ID) &&
                !draft.title?.trim())
            }
            className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-40"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}

type MobileWeekEventDialogProps = {
  draft: EventEditDraft;
  categories: Category[];
  relatedLifeLog: LifeLog | null;
  error: string;
  onChange: (draft: EventEditDraft) => void;
  onCancel: () => void;
  onDelete: () => void;
  onCreateLifeLog: () => void;
  onOpenLifeLog: (log: LifeLog) => void;
  onSave: () => void;
};

export function MobileWeekEventDialog({
  draft,
  categories,
  relatedLifeLog,
  error,
  onChange,
  onCancel,
  onDelete,
  onCreateLifeLog,
  onOpenLifeLog,
  onSave,
}: MobileWeekEventDialogProps) {
  return (
    <div className="fixed inset-0 z-[140] flex items-end bg-slate-950/50 p-3 backdrop-blur-sm md:hidden">
      <div className="w-full rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">予定を編集</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="編集を閉じる"
            className="rounded-full bg-slate-100 px-3 py-2 text-slate-500"
          >
            ✕
          </button>
        </div>

        <label className="mt-4 block text-sm font-bold text-slate-700">
          タイトル
        </label>
        <input
          value={draft.title}
          onChange={(event) =>
            onChange({ ...draft, title: event.target.value })
          }
          className="mt-1 w-full rounded-xl border p-3 text-slate-900"
        />

        <label className="mt-4 block text-sm font-bold text-slate-700">
          カテゴリ
        </label>
        <select
          value={draft.categoryId}
          onChange={(event) =>
            onChange({ ...draft, categoryId: event.target.value })
          }
          className="mt-1 w-full rounded-xl border p-3 text-slate-900"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm font-bold text-slate-700">
            開始
            <input
              value={draft.start}
              onChange={(event) =>
                onChange({ ...draft, start: event.target.value })
              }
              inputMode="numeric"
              placeholder="09:00"
              className="mt-1 w-full rounded-xl border p-3 font-mono text-slate-900"
            />
          </label>
          <label className="text-sm font-bold text-slate-700">
            終了
            <input
              value={draft.end}
              onChange={(event) =>
                onChange({ ...draft, end: event.target.value })
              }
              inputMode="numeric"
              placeholder="10:00"
              className="mt-1 w-full rounded-xl border p-3 font-mono text-slate-900"
            />
          </label>
        </div>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-500">関連ライフログ</p>
          {relatedLifeLog ? (
            <button
              type="button"
              onClick={() => onOpenLifeLog(relatedLifeLog)}
              className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 shadow-sm"
            >
              📝 {relatedLifeLog.title || relatedLifeLog.body || "本文なし"}
            </button>
          ) : (
            <p className="mt-2 text-sm text-slate-400">まだありません</p>
          )}
          <button
            type="button"
            onClick={
              relatedLifeLog
                ? () => onOpenLifeLog(relatedLifeLog)
                : onCreateLifeLog
            }
            className="mt-3 min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
          >
            {relatedLifeLog ? "ライフログを開く" : "ライフログを作成"}
          </button>
        </section>

        {error && (
          <p className="mt-3 text-sm font-bold text-red-600">{error}</p>
        )}

        <div className="mt-5 grid grid-cols-[auto_1fr_1fr] gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl bg-red-50 px-4 py-3 font-bold text-red-600"
          >
            削除
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border px-4 py-3 font-bold text-slate-600"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
