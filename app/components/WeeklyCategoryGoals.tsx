import { useState } from "react";
import {
  formatActualMinutes,
  getWeeklyCategoryGoals,
} from "@/app/lib/records";
import type {
  CategoryActual,
} from "@/app/lib/records";
import type { Category } from "@/app/types/calendar";

type WeeklyCategoryGoalsProps = {
  actuals: CategoryActual[];
  categories: Category[];
  onSave: (categoryId: string, goalMinutes?: number) => void;
};

export default function WeeklyCategoryGoals({
  actuals,
  categories,
  onSave,
}: WeeklyCategoryGoalsProps) {
  const goals = getWeeklyCategoryGoals(categories, actuals);
  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);
  const [hours, setHours] = useState("");
  const [error, setError] = useState("");

  function startEditing(category: Category) {
    setEditingCategory(category);
    setHours(
      category.weeklyGoalMinutes
        ? String(category.weeklyGoalMinutes / 60)
        : "",
    );
    setError("");
  }

  function save() {
    if (!editingCategory) return;
    const goalHours = Number(hours);
    if (!Number.isFinite(goalHours) || goalHours <= 0) {
      setError("0より大きい時間を入力してください。");
      return;
    }

    onSave(editingCategory.id, Math.round(goalHours * 60));
    setEditingCategory(null);
  }

  function clear() {
    if (!editingCategory) return;
    onSave(editingCategory.id, undefined);
    setEditingCategory(null);
  }

  return (
    <>
      <section
        aria-label="カテゴリ別週間目標"
        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <p className="text-xs font-bold text-slate-500">
          カテゴリ別週間目標
        </p>
        <div className="mt-2 grid gap-1.5">
          {goals.map((goal) => (
            <div
              key={goal.category.id}
              className="rounded-2xl bg-slate-50 p-3"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true">{goal.category.icon}</span>
                <span className="min-w-0 flex-1 break-words text-sm font-bold leading-snug text-slate-700 [overflow-wrap:anywhere]">
                  {goal.category.name}
                </span>
                <button
                  type="button"
                  onClick={() => startEditing(goal.category)}
                  className="mobile-interactive min-h-11 shrink-0 rounded-xl bg-blue-50 px-3 text-xs font-bold text-blue-600"
                >
                  {goal.goalMinutes === null ? "目標を設定する" : "変更"}
                </button>
              </div>
              {goal.goalMinutes !== null && (
                <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <dt className="text-[11px] font-bold text-slate-500">
                      目標
                    </dt>
                    <dd className="text-xs font-bold tabular-nums text-slate-700">
                      {formatActualMinutes(goal.goalMinutes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold text-slate-500">
                      現在
                    </dt>
                    <dd className="text-xs font-bold tabular-nums text-emerald-700">
                      {formatActualMinutes(goal.currentMinutes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold text-slate-500">
                      残り
                    </dt>
                    <dd className="text-xs font-bold tabular-nums text-blue-700">
                      {formatActualMinutes(goal.remainingMinutes ?? 0)}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          ))}
        </div>
      </section>

      {editingCategory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="weekly-goal-dialog-title"
          className="fixed inset-0 z-[150] flex items-end bg-slate-950/35 p-3 backdrop-blur-sm md:items-center md:justify-center"
        >
          <div className="mobile-sheet w-full rounded-3xl bg-white p-5 shadow-2xl md:max-w-sm">
            <h2
              id="weekly-goal-dialog-title"
              className="text-lg font-bold text-slate-900"
            >
              {editingCategory.icon} {editingCategory.name}の週間目標
            </h2>
            <label className="mt-4 block text-sm font-bold text-slate-600">
              目標時間
              <div className="mt-2 flex items-center gap-2">
                <input
                  autoFocus
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={hours}
                  onChange={(event) => {
                    setHours(event.target.value);
                    setError("");
                  }}
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-slate-500"
                />
                <span className="text-sm font-bold text-slate-500">時間</span>
              </div>
            </label>
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="mobile-interactive min-h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={save}
                className="mobile-interactive min-h-11 rounded-xl bg-slate-900 text-sm font-bold text-white"
              >
                保存
              </button>
            </div>
            {editingCategory.weeklyGoalMinutes && (
              <button
                type="button"
                onClick={clear}
                className="mobile-interactive mt-3 min-h-11 w-full rounded-xl text-sm font-bold text-rose-600"
              >
                目標を解除
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
