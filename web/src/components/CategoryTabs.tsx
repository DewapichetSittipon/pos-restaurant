import type { Category } from '../type/domain';
import { localizedName, useLang } from '../i18n';

interface CategoryTabsProps {
  categories: Category[];
  activeId: number;
  onSelect: (id: number) => void;
}

export function CategoryTabs({ categories, activeId, onSelect }: CategoryTabsProps) {
  const lang = useLang();
  return (
    <div className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-warm/95 px-4 py-3 backdrop-blur">
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
            cat.id === activeId
              ? 'bg-linear-to-br from-orange-500 to-rose-500 text-white shadow-sm shadow-orange-500/30'
              : 'bg-white text-slate-600 ring-1 ring-slate-200/70'
          }`}
        >
          {localizedName(cat, lang)}
        </button>
      ))}
    </div>
  );
}
