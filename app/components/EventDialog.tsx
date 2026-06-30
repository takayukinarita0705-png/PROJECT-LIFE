import { DAYS } from "@/app/lib/calendar";
import { formatTime } from "@/app/lib/time";
import type { Category, Draft } from "@/app/types/calendar";

type EventDialogProps = {
  draft: Draft;
  categories: Category[];
  activeCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onCancel: () => void;
  onAdd: () => void;
};

export default function EventDialog({
  draft,
  categories,
  activeCategoryId,
  onCategoryChange,
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
            disabled={categories.length === 0}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-40"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
