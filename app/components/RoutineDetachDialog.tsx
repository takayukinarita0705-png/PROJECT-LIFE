type RoutineDetachDialogProps = {
  onDetach: () => void;
  onKeep: () => void;
};

export default function RoutineDetachDialog({
  onDetach,
  onKeep,
}: RoutineDetachDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="routine-detach-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <h2
          id="routine-detach-title"
          className="text-base font-bold text-slate-900"
        >
          この予定をルーティンから切り離しますか？
        </h2>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={onDetach}
            className="min-h-11 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700"
          >
            はい（ルーティン解除）
          </button>
          <button
            type="button"
            onClick={onKeep}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            いいえ（ルーティン維持）
          </button>
        </div>
      </div>
    </div>
  );
}
