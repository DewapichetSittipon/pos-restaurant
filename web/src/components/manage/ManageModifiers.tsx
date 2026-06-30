import { useState } from 'react';
import type { MenuItem } from '../../type/domain';
import type { ModifierGroupInput } from '../../type/manage';
import { setMenuModifiers } from '../../services/manageApi';
import { useSubscriptionStore } from '../../store/subscriptionStore';

// editor state ใช้ราคาเป็น "บาท" (string) เพื่อกรอกง่าย แล้วแปลงเป็นสตางค์ตอนบันทึก
interface OptDraft {
  name: string;
  nameEn: string;
  nameZh: string;
  priceBaht: string;
  isAvailable: boolean;
}
interface GroupDraft {
  name: string;
  nameEn: string;
  nameZh: string;
  minSelect: number;
  maxSelect: number;
  options: OptDraft[];
}

function toDrafts(menu: MenuItem): GroupDraft[] {
  return (menu.modifierGroups ?? []).map((g) => ({
    name: g.name,
    nameEn: g.nameEn ?? '',
    nameZh: g.nameZh ?? '',
    minSelect: g.minSelect,
    maxSelect: g.maxSelect,
    options: g.options.map((o) => ({
      name: o.name,
      nameEn: o.nameEn ?? '',
      nameZh: o.nameZh ?? '',
      priceBaht: (o.priceDelta / 100).toString(),
      isAvailable: o.isAvailable,
    })),
  }));
}

interface Props {
  menu: MenuItem;
  onClose: () => void;
  onSaved: () => void;
}

export function ManageModifiers({ menu, onClose, onSaved }: Props) {
  const canI18n = useSubscriptionStore((s) => s.hasFeature('i18n'));
  const [groups, setGroups] = useState<GroupDraft[]>(() => toDrafts(menu));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function patchGroup(gi: number, patch: Partial<GroupDraft>): void {
    setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  }
  function patchOpt(gi: number, oi: number, patch: Partial<OptDraft>): void {
    setGroups((gs) =>
      gs.map((g, i) =>
        i === gi
          ? {
              ...g,
              options: g.options.map((o, j) =>
                j === oi ? { ...o, ...patch } : o,
              ),
            }
          : g,
      ),
    );
  }

  async function save(): Promise<void> {
    setError(null);
    // validate + แปลงเป็น payload (สตางค์)
    const payload: ModifierGroupInput[] = [];
    for (const g of groups) {
      if (!g.name.trim()) {
        setError('ชื่อกลุ่มห้ามว่าง');
        return;
      }
      const options = [];
      for (const o of g.options) {
        if (!o.name.trim()) {
          setError(`ตัวเลือกในกลุ่ม "${g.name}" มีชื่อว่าง`);
          return;
        }
        const baht = parseFloat(o.priceBaht || '0');
        if (!(baht >= 0)) {
          setError(`ราคาตัวเลือก "${o.name}" ไม่ถูกต้อง`);
          return;
        }
        options.push({
          name: o.name.trim(),
          nameEn: o.nameEn,
          nameZh: o.nameZh,
          priceDelta: Math.round(baht * 100),
          isAvailable: o.isAvailable,
        });
      }
      if (options.length === 0) {
        setError(`กลุ่ม "${g.name}" ต้องมีอย่างน้อย 1 ตัวเลือก`);
        return;
      }
      if (g.maxSelect < 1 || g.maxSelect < g.minSelect) {
        setError(`กลุ่ม "${g.name}" ค่า เลือกได้สูงสุด ไม่ถูกต้อง`);
        return;
      }
      payload.push({
        name: g.name.trim(),
        nameEn: g.nameEn,
        nameZh: g.nameZh,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        options,
      });
    }
    setBusy(true);
    try {
      await setMenuModifiers(menu.id, payload);
      onSaved();
    } catch {
      setError('บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mx-auto max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">ตัวเลือกของ “{menu.name}”</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-400">
            ปิด
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}

        <div className="space-y-4">
          {groups.map((g, gi) => (
            <div key={gi} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={g.name}
                  onChange={(e) => patchGroup(gi, { name: e.target.value })}
                  placeholder="ชื่อกลุ่ม (ไทย) เช่น ขนาด / ระดับความเผ็ด"
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setGroups((gs) => gs.filter((_, i) => i !== gi))}
                  className="rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-600"
                >
                  ลบกลุ่ม
                </button>
              </div>

              {canI18n && (
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={g.nameEn}
                    onChange={(e) => patchGroup(gi, { nameEn: e.target.value })}
                    placeholder="ชื่อกลุ่ม EN (ถ้ามี)"
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  />
                  <input
                    value={g.nameZh}
                    onChange={(e) => patchGroup(gi, { nameZh: e.target.value })}
                    placeholder="ชื่อกลุ่ม 中文 (ถ้ามี)"
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  />
                </div>
              )}

              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                <label className="flex items-center gap-1">
                  เลือกอย่างน้อย
                  <input
                    type="number"
                    min={0}
                    value={g.minSelect}
                    onChange={(e) =>
                      patchGroup(gi, { minSelect: Number(e.target.value) })
                    }
                    className="w-14 rounded border border-slate-200 px-1 py-0.5"
                  />
                </label>
                <label className="flex items-center gap-1">
                  สูงสุด
                  <input
                    type="number"
                    min={1}
                    value={g.maxSelect}
                    onChange={(e) =>
                      patchGroup(gi, { maxSelect: Number(e.target.value) })
                    }
                    className="w-14 rounded border border-slate-200 px-1 py-0.5"
                  />
                </label>
              </div>

              <div className="mt-2 space-y-1.5">
                {g.options.map((o, oi) => (
                  <div key={oi} className="rounded-lg bg-slate-50 p-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        value={o.name}
                        onChange={(e) => patchOpt(gi, oi, { name: e.target.value })}
                        placeholder="ชื่อตัวเลือก (ไทย)"
                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">+฿</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={o.priceBaht}
                          onChange={(e) =>
                            patchOpt(gi, oi, { priceBaht: e.target.value })
                          }
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          patchGroup(gi, {
                            options: g.options.filter((_, j) => j !== oi),
                          })
                        }
                        className="text-slate-400"
                      >
                        ✕
                      </button>
                    </div>
                    {canI18n && (
                      <div className="mt-1 flex gap-2">
                        <input
                          value={o.nameEn}
                          onChange={(e) => patchOpt(gi, oi, { nameEn: e.target.value })}
                          placeholder="EN (ถ้ามี)"
                          className="flex-1 rounded border border-slate-200 px-2 py-0.5 text-xs"
                        />
                        <input
                          value={o.nameZh}
                          onChange={(e) => patchOpt(gi, oi, { nameZh: e.target.value })}
                          placeholder="中文 (ถ้ามี)"
                          className="flex-1 rounded border border-slate-200 px-2 py-0.5 text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    patchGroup(gi, {
                      options: [
                        ...g.options,
                        { name: '', nameEn: '', nameZh: '', priceBaht: '0', isAvailable: true },
                      ],
                    })
                  }
                  className="text-xs font-medium text-orange-600"
                >
                  + เพิ่มตัวเลือก
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setGroups((gs) => [
                ...gs,
                { name: '', nameEn: '', nameZh: '', minSelect: 0, maxSelect: 1, options: [] },
              ])
            }
            className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-500"
          >
            + เพิ่มกลุ่มตัวเลือก
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="flex-1 rounded-xl bg-linear-to-r from-orange-500 to-rose-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}
