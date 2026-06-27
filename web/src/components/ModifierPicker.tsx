import { useEffect, useState } from 'react';
import type { MenuItem, ModifierOption } from '../type/domain';
import { formatBaht } from '../utils/money';
import { MenuThumb } from './MenuThumb';

interface ModifierPickerProps {
  menu: MenuItem | null;
  onClose: () => void;
  onConfirm: (menu: MenuItem, options: ModifierOption[]) => void;
}

// โมดอลเลือกตัวเลือกของเมนู (ขนาด/ระดับ/ท็อปปิ้ง) ก่อนใส่ตะกร้า
// maxSelect === 1 = เลือกได้ตัวเดียว (radio), > 1 = หลายตัว (checkbox จำกัดจำนวน)
export function ModifierPicker({ menu, onClose, onConfirm }: ModifierPickerProps) {
  // selected: groupId -> set ของ optionId
  const [selected, setSelected] = useState<Record<number, number[]>>({});

  // reset ทุกครั้งที่เปิดเมนูใหม่
  const groups = menu?.modifierGroups ?? [];
  const menuKey = menu?.id ?? -1;
  useEffect(() => setSelected({}), [menuKey]);

  if (!menu) return null;

  function toggle(groupId: number, optId: number, maxSelect: number): void {
    setSelected((prev) => {
      const cur = prev[groupId] ?? [];
      if (cur.includes(optId)) {
        return { ...prev, [groupId]: cur.filter((id) => id !== optId) };
      }
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [optId] }; // เลือกเดี่ยว = แทนที่
      }
      if (cur.length >= maxSelect) return prev; // เต็มแล้ว
      return { ...prev, [groupId]: [...cur, optId] };
    });
  }

  const chosenOptions: ModifierOption[] = groups.flatMap((g) =>
    g.options.filter((o) => (selected[g.id] ?? []).includes(o.id)),
  );

  // ต้องเลือกครบ minSelect ทุกกลุ่มจึงจะยืนยันได้
  const unmet = groups.filter(
    (g) => (selected[g.id] ?? []).length < g.minSelect,
  );
  const canConfirm = unmet.length === 0;
  const extra = chosenOptions.reduce((s, o) => s + o.priceDelta, 0);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mx-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-warm p-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
        <div className="mb-4 flex items-center gap-3">
          <MenuThumb imageUrl={menu.imageUrl} alt={menu.name} className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{menu.name}</p>
            <p className="text-sm font-semibold text-orange-600">
              {formatBaht(menu.price)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-medium text-slate-400">
            ปิด
          </button>
        </div>

        <div className="space-y-4">
          {groups.map((g) => {
            const sel = selected[g.id] ?? [];
            return (
              <div key={g.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="font-semibold text-slate-700">{g.name}</p>
                  <span className="text-xs text-slate-400">
                    {g.minSelect > 0 ? 'ต้องเลือก' : 'ไม่บังคับ'}
                    {g.maxSelect > 1 ? ` · ได้สูงสุด ${g.maxSelect}` : ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {g.options.map((o) => {
                    const checked = sel.includes(o.id);
                    const disabled = !o.isAvailable;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggle(g.id, o.id, g.maxSelect)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                          checked
                            ? 'border-orange-400 bg-orange-50 font-semibold text-orange-700'
                            : 'border-slate-200 bg-white text-slate-700'
                        } ${disabled ? 'opacity-40' : 'active:scale-[0.99]'}`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`grid h-4 w-4 place-items-center border text-[10px] ${
                              g.maxSelect === 1 ? 'rounded-full' : 'rounded-md'
                            } ${checked ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300'}`}
                          >
                            {checked ? '✓' : ''}
                          </span>
                          {o.name}
                          {disabled && ' (หมด)'}
                        </span>
                        {o.priceDelta > 0 && (
                          <span className="text-slate-500">+{formatBaht(o.priceDelta)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => onConfirm(menu, chosenOptions)}
          className="mt-5 w-full rounded-xl bg-linear-to-r from-orange-500 to-rose-500 py-4 font-bold text-white shadow-lg shadow-orange-500/30 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
        >
          {canConfirm
            ? `เพิ่มลงตะกร้า · ${formatBaht(menu.price + extra)}`
            : `เลือก ${unmet[0].name} ก่อน`}
        </button>
      </div>
    </div>
  );
}
