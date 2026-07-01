export type MobilePage = "today" | "week";

type MobileBottomTabsProps = {
  activePage: MobilePage;
  onChange: (page: MobilePage) => void;
};

const TABS: Array<{ page: MobilePage; label: string; icon: string }> = [
  { page: "today", label: "今日", icon: "📅" },
  { page: "week", label: "今週", icon: "📊" },
];

export default function MobileBottomTabs({
  activePage,
  onChange,
}: MobileBottomTabsProps) {
  return (
    <nav
      aria-label="スマホページ"
      className="fixed inset-x-0 bottom-0 z-[110] border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-2">
        {TABS.map((tab) => {
          const isActive = activePage === tab.page;
          return (
            <button
              key={tab.page}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onChange(tab.page)}
              className={`min-h-12 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <span aria-hidden="true" className="mr-1.5">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
