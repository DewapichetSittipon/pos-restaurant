import type { MenuItem } from '../type/domain';
import { formatBaht } from '../utils/money';
import { isOrderable } from '../utils/menu';
import { MenuThumb } from './MenuThumb';

interface MenuCardProps {
  menu: MenuItem;
  onAdd: (menu: MenuItem) => void;
}

export function MenuCard({ menu, onAdd }: MenuCardProps) {
  const orderable = isOrderable(menu);
  const lowStock =
    menu.stockCount !== null && menu.stockCount > 0 && menu.stockCount <= 5;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition active:scale-[0.99]">
      <MenuThumb imageUrl={menu.imageUrl} alt={menu.name} className="h-16 w-16" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-800">
          {menu.name}
          {menu.isCombo && (
            <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-700">
              ชุด
            </span>
          )}
        </p>
        <p className="text-sm font-semibold text-orange-600">{formatBaht(menu.price)}</p>
        {menu.isCombo && menu.comboComponents && menu.comboComponents.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {menu.comboComponents
              .map((c) => (c.quantity > 1 ? `${c.menu.name}×${c.quantity}` : c.menu.name))
              .join(' + ')}
          </p>
        )}
        {orderable && lowStock && (
          <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
            🔥 เหลือ {menu.stockCount} ที่
          </p>
        )}
      </div>
      {orderable ? (
        <button
          type="button"
          onClick={() => onAdd(menu)}
          className="shrink-0 rounded-xl bg-linear-to-br from-orange-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-500/30 active:scale-95"
        >
          เพิ่ม
        </button>
      ) : (
        <span className="shrink-0 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400">
          หมด
        </span>
      )}
    </div>
  );
}
