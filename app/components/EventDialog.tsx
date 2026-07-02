import { DAYS, FREE_CATEGORY_ID } from "@/app/lib/calendar";
import { formatTime } from "@/app/lib/time";
import type {
  Category,
  Draft,
  EventEditDraft,
} from "@/app/types/calendar";

type EventDialogProps = {
  draft: Draft;
  categories: Category[];
  activeCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onTitleChange: (title: string) => void;
  onCancel: () => void;
  onAdd: () => void;
};

export default function EventDialog({
  draft,
  categories,
  activeCategoryId,
  onCategoryChange,
  onTitleChange,
  onCancel,
  onAdd,
}: EventDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-xl font-bold text-slate-900">予定を追加</h3>
        <p className="mt-1 text-sm text-slate-500">
          {DAYS[draft.day]}曜日 {formatTime(draft.start)}〜
          {formatTime(draft.end)}
        </p>

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

        {activeCategoryId === FREE_CATEGORY_ID && (
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

        {categories.length === 0 && (
          <p className="mt-2 text-sm text-red-600">
            先にカテゴリ管理からカテゴリを追加してください。
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
            onClick={onAdd}
            disabled={
              categories.length === 0 ||
              (activeCategoryId === FREE_CATEGORY_ID &&
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
  error: string;
  onChange: (draft: EventEditDraft) => void;
  onCancel: () => void;
  onDelete: () => void;
  onSave: () => void;
};

export function MobileWeekEventDialog({
  draft,
  categories,
  error,
  onChange,
  onCancel,
  onDelete,
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
