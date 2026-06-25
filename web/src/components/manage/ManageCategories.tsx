import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  renameCategory,
} from '../../services/manageApi';
import type { CategoryRow } from '../../type/manage';

function errMsg(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? String(err.response.data.message)
    : fallback;
}

export function ManageCategories() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    fetchCategories()
      .then(setRows)
      .catch(() => setError('โหลดหมวดหมู่ไม่สำเร็จ'));
  }, []);

  useEffect(() => reload(), [reload]);

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createCategory(name.trim());
      setName('');
      reload();
    } catch (err) {
      setError(errMsg(err, 'เพิ่มหมวดไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  async function saveRename(): Promise<void> {
    if (editId == null || !editName.trim()) return;
    setError(null);
    try {
      await renameCategory(editId, editName.trim());
      setEditId(null);
      reload();
    } catch (err) {
      setError(errMsg(err, 'แก้ชื่อไม่สำเร็จ'));
    }
  }

  async function remove(id: number): Promise<void> {
    setError(null);
    try {
      await deleteCategory(id);
      reload();
    } catch (err) {
      setError(errMsg(err, 'ลบหมวดไม่สำเร็จ'));
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-bold">หมวดหมู่ ({rows.length})</h2>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อหมวด เช่น เครื่องดื่ม"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          เพิ่มหมวด
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      <ul className="space-y-2">
        {rows.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
          >
            {editId === c.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5"
                />
                <button
                  type="button"
                  onClick={saveRename}
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
              </>
            ) : (
              <>
                <span className="flex-1 font-medium">
                  {c.name}{' '}
                  <span className="text-sm text-slate-400">({c.menuCount} เมนู)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditId(c.id);
                    setEditName(c.name);
                  }}
                  className="text-sm text-slate-500 hover:text-slate-800"
                >
                  แก้ชื่อ
                </button>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="text-sm text-rose-500 hover:text-rose-700"
                >
                  ลบ
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
