import WeeklyCalendar from "./components/WeeklyCalendar";

export default function Home() {
  return (
    <main className="lifeos-shell min-h-screen bg-slate-100">
      <header className="lifeos-header sticky top-0 z-40 bg-slate-900 text-white shadow">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <h1 className="text-3xl font-bold">LifeOS</h1>
          <p className="text-sm text-slate-300">
            あなた専用ライフマネジメントシステム
          </p>
        </div>
      </header>

      <div className="lifeos-content mx-auto max-w-7xl p-6">
        <WeeklyCalendar />
      </div>
    </main>
  );
}
