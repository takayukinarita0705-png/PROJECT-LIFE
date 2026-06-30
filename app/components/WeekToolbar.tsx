import { dateLabel } from "@/app/lib/calendar";
import type { CalendarTemplate } from "@/app/types/calendar";

type WeekToolbarProps = {
  weekDates: Date[];
  templates: CalendarTemplate[];
  hasLoadedEvents: boolean;
  hasLoadedTemplates: boolean;
  onPreviousWeek: () => void;
  onCurrentWeek: () => void;
  onNextWeek: () => void;
  onOpenCategoryManager: () => void;
  onCreateNextWeek: () => void;
  onApplyFixedTemplate: (secondDayOff: 1 | 3) => void;
  onSaveCurrentWeekTemplate: () => void;
  onApplyTemplate: (template: CalendarTemplate) => void;
  onDeleteTemplate: (template: CalendarTemplate) => void;
};

export default function WeekToolbar({
  weekDates,
  templates,
  hasLoadedEvents,
  hasLoadedTemplates,
  onPreviousWeek,
  onCurrentWeek,
  onNextWeek,
  onOpenCategoryManager,
  onCreateNextWeek,
  onApplyFixedTemplate,
  onSaveCurrentWeekTemplate,
  onApplyTemplate,
  onDeleteTemplate,
}: WeekToolbarProps) {
  return (
    <div className="mb-4 rounded-xl bg-white p-4 shadow">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">週間スケジュール</h2>
          <p className="text-sm text-slate-500">
            {dateLabel(weekDates[0])}〜{dateLabel(weekDates[6])}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onPreviousWeek}
            className="rounded-xl border px-4 py-2 font-bold text-slate-700"
          >
            ← 前週
          </button>
          <button
            onClick={onCurrentWeek}
            className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white"
          >
            今週
          </button>
          <button
            onClick={onNextWeek}
            className="rounded-xl border px-4 py-2 font-bold text-slate-700"
          >
            次週 →
          </button>
          <button
            onClick={onOpenCategoryManager}
            className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 font-bold text-violet-700"
          >
            カテゴリ管理
          </button>
          <button
            onClick={onCreateNextWeek}
            className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white"
          >
            来週を作成
          </button>
          <button
            onClick={() => onApplyFixedTemplate(1)}
            disabled={!hasLoadedEvents}
            className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            火曜休みテンプレート
          </button>
          <button
            onClick={() => onApplyFixedTemplate(3)}
            disabled={!hasLoadedEvents}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            木曜休みテンプレート
          </button>
          <button
            onClick={onSaveCurrentWeekTemplate}
            disabled={!hasLoadedEvents || !hasLoadedTemplates}
            className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 font-bold text-indigo-700 disabled:opacity-50"
          >
            現在の1週間をテンプレート保存
          </button>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="mb-2 text-sm font-bold text-slate-600">
            保存したテンプレート
          </p>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex overflow-hidden rounded-xl border border-slate-300 bg-white"
              >
                <button
                  onClick={() => onApplyTemplate(template)}
                  disabled={!hasLoadedEvents}
                  className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  title={`${template.name}を適用`}
                >
                  {template.name}
                </button>
                <button
                  onClick={() => onDeleteTemplate(template)}
                  className="border-l border-slate-200 px-2 py-2 text-sm text-red-500 hover:bg-red-50"
                  aria-label={`${template.name}を削除`}
                  title="削除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
