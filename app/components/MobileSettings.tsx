export default function MobileSettings() {
  return (
    <section className="md:hidden">
      <header className="mb-4">
        <p className="text-xs font-bold tracking-[0.18em] text-slate-400">
          SETTINGS
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">設定</h2>
      </header>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 py-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50"
          >
            🎨
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">カテゴリ管理</p>
            <p className="text-xs text-slate-400">準備中</p>
          </div>
        </div>

        <div className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 py-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50"
          >
            🎯
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">週間目標設定</p>
            <p className="text-xs text-slate-400">準備中</p>
          </div>
        </div>

        <div className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 py-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50"
          >
            📋
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">テンプレート管理</p>
            <p className="text-xs text-slate-400">準備中</p>
          </div>
        </div>

        <div className="flex min-h-16 items-center gap-3 px-4 py-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50"
          >
            ℹ️
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">アプリ情報</p>
            <p className="text-xs text-slate-400">Project LIFE</p>
          </div>
        </div>
      </div>
    </section>
  );
}
