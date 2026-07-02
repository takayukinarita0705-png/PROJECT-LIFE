import {
  formatActualMinutes,
  getActualsByCategory,
} from "@/app/lib/records";

type ActualsListProps = {
  actuals: ReturnType<typeof getActualsByCategory>;
};

export default function ActualsList({ actuals }: ActualsListProps) {
  if (actuals.length === 0) {
    return (
      <p className="mt-1 text-xs text-slate-400">
        完了した予定はまだありません
      </p>
    );
  }

  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {actuals.map((actual) => (
        <li
          key={actual.categoryId}
          className="flex items-center gap-1.5 rounded-lg border bg-slate-50 px-2 py-1 text-xs"
          style={{ borderColor: actual.color }}
        >
          <span aria-hidden="true">{actual.icon}</span>
          <span className="font-bold text-slate-700">{actual.name}</span>
          <span className="font-bold tabular-nums text-slate-500">
            {formatActualMinutes(actual.minutes)}
          </span>
        </li>
      ))}
    </ul>
  );
}
