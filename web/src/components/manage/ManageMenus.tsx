import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  archiveMenu,
  clearMenuImage,
  createMenu,
  fetchCatalog,
  updateMenu,
  uploadMenuImage,
} from '../../services/manageApi';
import { formatBaht } from '../../utils/money';
import { MenuThumb } from '../MenuThumb';
import { ManageModifiers } from './ManageModifiers';
import type { Category, MenuItem } from '../../type/domain';

function errMsg(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? String(err.response.data.message)
    : fallback;
}

// "" = ไม่นับสต็อก (null) | ตัวเลข = จำนวนสต็อก
function parseStock(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

const EMPTY_NEW = {
  categoryId: 0,
  name: '',
  nameEn: '',
  nameZh: '',
  priceBaht: '',
  stock: '',
};

export function ManageMenus() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(EMPTY_NEW);
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState({
    name: '',
    nameEn: '',
    nameZh: '',
    priceBaht: '',
    stock: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modMenu, setModMenu] = useState<MenuItem | null>(null);

  const reload = useCallback(() => {
    fetchCatalog()
      .then((cats) => {
        setCategories(cats);
        setForm((f) => ({
          ...f,
          categoryId: f.categoryId || cats[0]?.id || 0,
        }));
      })
      .catch(() => setError('โหลดเมนูไม่สำเร็จ'));
  }, []);

  useEffect(() => reload(), [reload]);

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const priceBaht = Number(form.priceBaht);
    if (!form.categoryId || !form.name.trim() || !(priceBaht >= 0)) {
      setError('กรอกหมวด ชื่อ และราคาให้ถูกต้อง');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createMenu({
        categoryId: form.categoryId,
        name: form.name.trim(),
        nameEn: form.nameEn,
        nameZh: form.nameZh,
        price: Math.round(priceBaht * 100),
        stockCount: parseStock(form.stock),
      });
      setForm((f) => ({ ...EMPTY_NEW, categoryId: f.categoryId }));
      reload();
    } catch (err) {
      setError(errMsg(err, 'เพิ่มเมนูไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(m: MenuItem): void {
    setEditId(m.id);
    setEdit({
      name: m.name,
      nameEn: m.nameEn ?? '',
      nameZh: m.nameZh ?? '',
      priceBaht: String(m.price / 100),
      stock: m.stockCount == null ? '' : String(m.stockCount),
    });
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
        stockCount: parseStock(edit.stock),
      });
      setEditId(null);
      reload();
    } catch (err) {
      setError(errMsg(err, 'แก้ไขเมนูไม่สำเร็จ'));
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
      setError(errMsg(err, 'ลบเมนูไม่สำเร็จ'));
    }
  }

  async function uploadImg(id: number, file: File): Promise<void> {
    setError(null);
    try {
      await uploadMenuImage(id, file);
      reload();
    } catch (err) {
      setError(errMsg(err, 'อัปโหลดรูปไม่สำเร็จ'));
    }
  }

  async function clearImg(id: number): Promise<void> {
    setError(null);
    try {
      await clearMenuImage(id);
      reload();
    } catch (err) {
      setError(errMsg(err, 'ลบรูปไม่สำเร็จ'));
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-bold">เมนู</h2>

      {/* ฟอร์มเพิ่มเมนู */}
      <form onSubmit={add} className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-12">
        <select
          value={form.categoryId}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: Number(e.target.value) }))}
          className="rounded-lg border border-slate-300 px-3 py-2.5 sm:col-span-3"
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
          placeholder="ชื่อเมนู (ไทย)"
          className="rounded-lg border border-slate-300 px-3 py-2.5 sm:col-span-4"
        />
        <input
          value={form.nameEn}
          onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
          placeholder="ชื่อ EN (ถ้ามี)"
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm sm:col-span-3"
        />
        <input
          value={form.nameZh}
          onChange={(e) => setForm((f) => ({ ...f, nameZh: e.target.value }))}
          placeholder="ชื่อ 中文 (ถ้ามี)"
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm sm:col-span-3"
        />
        <input
          value={form.priceBaht}
          onChange={(e) => setForm((f) => ({ ...f, priceBaht: e.target.value }))}
          inputMode="decimal"
          placeholder="ราคา (บาท)"
          className="rounded-lg border border-slate-300 px-3 py-2.5 sm:col-span-2"
        />
        <input
          value={form.stock}
          onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
          inputMode="numeric"
          placeholder="สต็อก (ว่าง=ไม่นับ)"
          className="rounded-lg border border-slate-300 px-3 py-2.5 sm:col-span-2"
        />
        <button
          type="submit"
          disabled={busy || categories.length === 0}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50 sm:col-span-1"
        >
          เพิ่ม
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      {/* รายการเมนูแยกตามหมวด */}
      <div className="space-y-5">
        {categories.map((cat) => (
          <div key={cat.id}>
            <h3 className="mb-2 text-sm font-semibold text-slate-500">{cat.name}</h3>
            {cat.menus.filter((m) => !m.isCombo).length === 0 ? (
              <p className="text-sm text-slate-400">— ยังไม่มีเมนู —</p>
            ) : (
              <ul className="space-y-2">
                {cat.menus
                  .filter((m) => !m.isCombo)
                  .map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg border border-slate-200 px-3 py-2.5"
                  >
                    {editId === m.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={edit.name}
                          onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))}
                          placeholder="ชื่อ (ไทย)"
                          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5"
                        />
                        <input
                          value={edit.nameEn}
                          onChange={(e) => setEdit((s) => ({ ...s, nameEn: e.target.value }))}
                          placeholder="EN"
                          className="w-28 rounded border border-slate-200 px-2 py-1.5 text-sm"
                        />
                        <input
                          value={edit.nameZh}
                          onChange={(e) => setEdit((s) => ({ ...s, nameZh: e.target.value }))}
                          placeholder="中文"
                          className="w-28 rounded border border-slate-200 px-2 py-1.5 text-sm"
                        />
                        <input
                          value={edit.priceBaht}
                          onChange={(e) => setEdit((s) => ({ ...s, priceBaht: e.target.value }))}
                          inputMode="decimal"
                          className="w-24 rounded border border-slate-300 px-2 py-1.5"
                          placeholder="บาท"
                        />
                        <input
                          value={edit.stock}
                          onChange={(e) => setEdit((s) => ({ ...s, stock: e.target.value }))}
                          inputMode="numeric"
                          className="w-28 rounded border border-slate-300 px-2 py-1.5"
                          placeholder="สต็อก"
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
                        <MenuThumb
                          imageUrl={m.imageUrl}
                          alt={m.name}
                          className="h-12 w-12"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {m.name}
                            {!m.isAvailable && (
                              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                                งดขาย
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatBaht(m.price)} ·{' '}
                            {m.stockCount == null
                              ? 'ไม่นับสต็อก'
                              : m.stockCount === 0
                                ? 'หมด'
                                : `เหลือ ${m.stockCount}`}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <label className="cursor-pointer text-indigo-600 hover:text-indigo-800">
                              {m.imageUrl ? 'เปลี่ยนรูป' : 'เพิ่มรูป'}
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) uploadImg(m.id, f);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            {m.imageUrl && (
                              <button
                                type="button"
                                onClick={() => clearImg(m.id)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                ลบรูป
                              </button>
                            )}
                          </div>
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
                          onClick={() => startEdit(m)}
                          className="text-sm text-slate-500 hover:text-slate-800"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setModMenu(m)}
                          className="text-sm text-orange-500 hover:text-orange-700"
                        >
                          ตัวเลือก
                          {m.modifierGroups && m.modifierGroups.length > 0
                            ? ` (${m.modifierGroups.length})`
                            : ''}
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
            )}
          </div>
        ))}
      </div>

      {modMenu && (
        <ManageModifiers
          menu={modMenu}
          onClose={() => setModMenu(null)}
          onSaved={() => {
            setModMenu(null);
            reload();
          }}
        />
      )}
    </section>
  );
}
