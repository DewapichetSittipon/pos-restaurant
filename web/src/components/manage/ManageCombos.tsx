import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  archiveMenu,
  createCombo,
  fetchCatalog,
  setComboComponents,
  updateMenu,
} from '../../services/manageApi';
import { formatBaht } from '../../utils/money';
import { formatComboItems } from '../../utils/menu';
import type { Category, MenuItem } from '../../type/domain';
import { useSubscriptionStore } from '../../store/subscriptionStore';

function errMsg(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? String(err.response.data.message)
    : fallback;
}

// ส่วนประกอบที่กำลังร่าง (menuId + จำนวน)
interface CompDraft {
  menuId: number;
  quantity: number;
}

const EMPTY_NEW = { categoryId: 0, name: '', nameEn: '', nameZh: '', priceBaht: '' };

export function ManageCombos() {
  const canI18n = useSubscriptionStore((s) => s.hasFeature('i18n'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(EMPTY_NEW);
  const [newComps, setNewComps] = useState<CompDraft[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState({ name: '', nameEn: '', nameZh: '', priceBaht: '' });
  const [compsCombo, setCompsCombo] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    fetchCatalog()
      .then((cats) => {
        setCategories(cats);
        setForm((f) => ({ ...f, categoryId: f.categoryId || cats[0]?.id || 0 }));
      })
      .catch(() => setError('โหลดข้อมูลไม่สำเร็จ'));
  }, []);

  useEffect(() => reload(), [reload]);

  // เมนูจริงที่ใช้เป็นส่วนประกอบได้ (ไม่ใช่ combo) + map ไว้โชว์ชื่อ
  const componentMenus = useMemo(
    () => categories.flatMap((c) => c.menus).filter((m) => !m.isCombo),
    [categories],
  );
  const menuName = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of componentMenus) map.set(m.id, m.name);
    return map;
  }, [componentMenus]);

  const combos = useMemo(
    () =>
      categories
        .map((c) => ({ cat: c, items: c.menus.filter((m) => m.isCombo) }))
        .filter((g) => g.items.length > 0),
    [categories],
  );

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const priceBaht = Number(form.priceBaht);
    if (!form.categoryId || !form.name.trim() || !(priceBaht >= 0)) {
      setError('กรอกหมวด ชื่อ และราคาให้ถูกต้อง');
      return;
    }
    if (newComps.length === 0) {
      setError('เลือกอย่างน้อย 1 รายการในชุด');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createCombo({
        categoryId: form.categoryId,
        name: form.name.trim(),
        nameEn: form.nameEn,
        nameZh: form.nameZh,
        price: Math.round(priceBaht * 100),
        components: newComps,
      });
      setForm((f) => ({ ...EMPTY_NEW, categoryId: f.categoryId }));
      setNewComps([]);
      reload();
    } catch (err) {
      setError(errMsg(err, 'สร้างชุดไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(): Promise<void> {
    if (editId == null) return;
    setError(null);
    try {
      await updateMenu(editId, {
        name: edit.name.trim(),
        nameEn: edit.nameEn,
        nameZh: edit.nameZh,
        price: Math.round(Number(edit.priceBaht) * 100),
      });
      setEditId(null);
      reload();
    } catch (err) {
      setError(errMsg(err, 'แก้ไขชุดไม่สำเร็จ'));
    }
  }

  async function toggle(m: MenuItem): Promise<void> {
    setError(null);
    try {
      await updateMenu(m.id, { isAvailable: !m.isAvailable });
      reload();
    } catch (err) {
      setError(errMsg(err, 'เปลี่ยนสถานะไม่สำเร็จ'));
    }
  }

  async function remove(id: number): Promise<void> {
    setError(null);
    try {
      await archiveMenu(id);
      reload();
    } catch (err) {
      setError(errMsg(err, 'ลบชุดไม่สำเร็จ'));
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold">ชุด / คอมโบ</h2>
      <p className="mb-4 text-xs text-slate-400">
        ชุดราคาคงที่ที่รวมหลายเมนูเข้าด้วยกัน — ครัวเห็นส่วนประกอบแยกชิ้น
      </p>

      {componentMenus.length === 0 ? (
        <p className="text-sm text-slate-400">
          ยังไม่มีเมนูสำหรับใส่ในชุด — เพิ่มเมนูปกติก่อนในแท็บ “เมนู”
        </p>
      ) : (
        <form onSubmit={add} className="mb-5 space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
            <select
              value={form.categoryId}
              onChange={(e) =>
                setForm((f) => ({ ...f, categoryId: Number(e.target.value) }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2.5 sm:col-span-4"
            >
              {categories.length === 0 && <option value={0}>— ยังไม่มีหมวด —</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ชื่อชุด (ไทย) เช่น ชุดข้าวมันไก่"
              className="rounded-lg border border-slate-300 px-3 py-2.5 sm:col-span-5"
            />
            <input
              value={form.priceBaht}
              onChange={(e) => setForm((f) => ({ ...f, priceBaht: e.target.value }))}
              inputMode="decimal"
              placeholder="ราคา (บาท)"
              className="rounded-lg border border-slate-300 px-3 py-2.5 sm:col-span-3"
            />
            {canI18n && (
              <>
                <input
                  value={form.nameEn}
                  onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                  placeholder="ชื่อ EN (ถ้ามี)"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-6"
                />
                <input
                  value={form.nameZh}
                  onChange={(e) => setForm((f) => ({ ...f, nameZh: e.target.value }))}
                  placeholder="ชื่อ 中文 (ถ้ามี)"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-6"
                />
              </>
            )}
          </div>

          <ComponentPicker
            menus={componentMenus}
            value={newComps}
            onChange={setNewComps}
          />

          <button
            type="submit"
            disabled={busy || categories.length === 0}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            + สร้างชุด
          </button>
        </form>
      )}

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      <div className="space-y-5">
        {combos.length === 0 ? (
          <p className="text-sm text-slate-400">— ยังไม่มีชุด —</p>
        ) : (
          combos.map(({ cat, items }) => (
            <div key={cat.id}>
              <h3 className="mb-2 text-sm font-semibold text-slate-500">{cat.name}</h3>
              <ul className="space-y-2">
                {items.map((m) => (
                  <li key={m.id} className="rounded-lg border border-slate-200 px-3 py-2.5">
                    {editId === m.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={edit.name}
                          onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))}
                          placeholder="ชื่อ (ไทย)"
                          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5"
                        />
                        {canI18n && (
                          <>
                            <input
                              value={edit.nameEn}
                              onChange={(e) => setEdit((s) => ({ ...s, nameEn: e.target.value }))}
                              placeholder="EN"
                              className="w-24 rounded border border-slate-200 px-2 py-1.5 text-sm"
                            />
                            <input
                              value={edit.nameZh}
                              onChange={(e) => setEdit((s) => ({ ...s, nameZh: e.target.value }))}
                              placeholder="中文"
                              className="w-24 rounded border border-slate-200 px-2 py-1.5 text-sm"
                            />
                          </>
                        )}
                        <input
                          value={edit.priceBaht}
                          onChange={(e) =>
                            setEdit((s) => ({ ...s, priceBaht: e.target.value }))
                          }
                          inputMode="decimal"
                          className="w-24 rounded border border-slate-300 px-2 py-1.5"
                          placeholder="บาท"
                        />
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="text-sm font-medium text-indigo-600"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="text-sm text-slate-400"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {m.name}
                            {!m.isAvailable && (
                              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                                งดขาย
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-slate-500">{formatBaht(m.price)}</p>
                          <p className="mt-0.5 truncate text-xs text-violet-600">
                            {m.comboComponents && m.comboComponents.length > 0
                              ? formatComboItems(
                                  m.comboComponents.map((c) => ({
                                    name: c.menu.name,
                                    quantity: c.quantity,
                                  })),
                                )
                              : '— ยังไม่มีรายการ —'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle(m)}
                          className="text-sm text-slate-500 hover:text-slate-800"
                        >
                          {m.isAvailable ? 'งดขาย' : 'เปิดขาย'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(m.id);
                            setEdit({
                              name: m.name,
                              nameEn: m.nameEn ?? '',
                              nameZh: m.nameZh ?? '',
                              priceBaht: String(m.price / 100),
                            });
                          }}
                          className="text-sm text-slate-500 hover:text-slate-800"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompsCombo(m)}
                          className="text-sm text-violet-600 hover:text-violet-800"
                        >
                          รายการ
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(m.id)}
                          className="text-sm text-rose-500 hover:text-rose-700"
                        >
                          ลบ
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {compsCombo && (
        <ComboComponentsModal
          combo={compsCombo}
          menus={componentMenus}
          menuName={menuName}
          onClose={() => setCompsCombo(null)}
          onSaved={() => {
            setCompsCombo(null);
            reload();
          }}
        />
      )}
    </section>
  );
}

// ตัวเลือกส่วนประกอบ: เลือกเมนู + จำนวน เพิ่มเข้า list
function ComponentPicker({
  menus,
  value,
  onChange,
}: {
  menus: MenuItem[];
  value: CompDraft[];
  onChange: (v: CompDraft[]) => void;
}) {
  const [menuId, setMenuId] = useState<number>(0);
  const [qty, setQty] = useState('1');
  const name = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of menus) map.set(m.id, m.name);
    return map;
  }, [menus]);

  function addOne(): void {
    const id = menuId || menus[0]?.id || 0;
    const q = Math.max(1, Math.floor(Number(qty) || 1));
    if (!id || value.some((c) => c.menuId === id)) return;
    onChange([...value, { menuId: id, quantity: q }]);
    setQty('1');
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={menuId || menus[0]?.id || 0}
          onChange={(e) => setMenuId(Number(e.target.value))}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          {menus.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          inputMode="numeric"
          className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          placeholder="จำนวน"
        />
        <button
          type="button"
          onClick={addOne}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600"
        >
          + เพิ่มรายการ
        </button>
      </div>

      {value.length > 0 && (
        <ul className="mt-2 space-y-1">
          {value.map((c) => (
            <li
              key={c.menuId}
              className="flex items-center justify-between text-sm text-slate-600"
            >
              <span>
                {name.get(c.menuId) ?? `#${c.menuId}`}
                {c.quantity > 1 && <span className="text-slate-400"> ×{c.quantity}</span>}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.menuId !== c.menuId))}
                className="text-slate-400 hover:text-rose-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// โมดอลแก้รายการส่วนประกอบของชุดที่มีอยู่ (แทนที่ทั้งชุด)
function ComboComponentsModal({
  combo,
  menus,
  menuName,
  onClose,
  onSaved,
}: {
  combo: MenuItem;
  menus: MenuItem[];
  menuName: Map<number, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [comps, setComps] = useState<CompDraft[]>(
    () =>
      (combo.comboComponents ?? []).map((c) => ({
        menuId: c.menuId,
        quantity: c.quantity,
      })),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(): Promise<void> {
    if (comps.length === 0) {
      setError('ต้องมีอย่างน้อย 1 รายการในชุด');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setComboComponents(combo.id, comps);
      onSaved();
    } catch (err) {
      setError(errMsg(err, 'บันทึกไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mx-auto max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">รายการในชุด “{combo.name}”</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-400">
            ปิด
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}

        <ComponentPicker menus={menus} value={comps} onChange={setComps} />
        {comps.some((c) => !menuName.has(c.menuId)) && (
          <p className="mt-2 text-xs text-amber-600">
            * มีรายการที่อ้างเมนูที่ถูกลบ — เลือกใหม่ก่อนบันทึก
          </p>
        )}

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
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}
