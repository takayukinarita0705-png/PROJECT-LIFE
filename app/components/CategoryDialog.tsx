import type {
  Category,
  CategoryDraft,
} from "@/app/types/calendar";

type CategoryDialogProps = {
  categories: Category[];
  draft: CategoryDraft | null;
  onDraftChange: (draft: CategoryDraft | null) => void;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onSave: () => void;
};

export default function CategoryDialog({
  categories,
  draft,
  onDraftChange,
  onClose,
  onAdd,
  onEdit,
  onDelete,
  onSave,
}: CategoryDialogProps) {
  return (
    <div className="fixed inset-0 z-[130] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="mx-auto my-4 min-h-[calc(100dvh-2rem)] max-w-4xl rounded-3xl bg-slate-50 shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <h3 className="text-xl font-bold text-slate-900">カテゴリ管理</h3>
            <p className="text-sm text-slate-500">
              名前・色・アイコンを自由に変更できます
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="カテゴリ管理を閉じる"
            className="rounded-full bg-slate-100 px-3 py-2 text-slate-600 transition-colors hover:bg-slate-200"
          >
            ✕
          </button>
        </header>

        <div className="grid gap-5 p-5 md:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-bold text-slate-800">
                カテゴリ一覧（{categories.length}）
              </h4>
              <button
                onClick={onAdd}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
              >
                ＋ 追加
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                カテゴリがありません。「追加」から作成してください。
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm"
                  >
                    <div
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl text-white"
                      style={{ background: category.color }}
                    >
                      {category.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-800">
                        {category.name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {category.color}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => onEdit(category)}
                        className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => onDelete(category)}
                        className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside>
            {draft ? (
              <div className="sticky top-24 rounded-2xl border bg-white p-4 shadow-sm">
                <h4 className="font-bold text-slate-900">
                  {draft.id ? "カテゴリを編集" : "カテゴリを追加"}
                </h4>

                <label className="mt-4 block text-sm font-bold text-slate-700">
                  名前
                </label>
                <input
                  value={draft.name}
                  onChange={(event) =>
                    onDraftChange({ ...draft, name: event.target.value })
                  }
                  placeholder="例：資格勉強"
                  className="mt-1 w-full rounded-xl border p-3 text-slate-900"
                />

                <label className="mt-4 block text-sm font-bold text-slate-700">
                  色
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="color"
                    value={draft.color}
                    onChange={(event) =>
                      onDraftChange({ ...draft, color: event.target.value })
                    }
                    className="h-12 w-16 cursor-pointer rounded-xl border bg-white p-1"
                  />
                  <input
                    value={draft.color}
                    onChange={(event) =>
                      onDraftChange({ ...draft, color: event.target.value })
                    }
                    className="min-w-0 flex-1 rounded-xl border p-3 font-mono text-slate-900"
                  />
                </div>

                <label className="mt-4 block text-sm font-bold text-slate-700">
                  アイコン
                </label>
                <input
                  value={draft.icon}
                  onChange={(event) =>
                    onDraftChange({ ...draft, icon: event.target.value })
                  }
                  placeholder="例：📖"
                  className="mt-1 w-full rounded-xl border p-3 text-xl text-slate-900"
                />

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => onDraftChange(null)}
                    className="flex-1 rounded-xl border py-2.5 font-bold text-slate-600"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={onSave}
                    disabled={!draft.name.trim()}
                    className="flex-1 rounded-xl bg-violet-600 py-2.5 font-bold text-white disabled:opacity-40"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
                カテゴリを追加するか、一覧から編集を選んでください。
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
