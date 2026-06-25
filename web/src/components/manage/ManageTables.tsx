import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { fetchTables } from '../../services/staffApi';
import { createTable, deleteTable } from '../../services/manageApi';
import type { TableGridItem } from '../../type/staff';

function errMsg(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? String(err.response.data.message)
    : fallback;
}

export function ManageTables() {
  const [tables, setTables] = useState<TableGridItem[]>([]);
  const [number, setNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    fetchTables()
      .then(setTables)
      .catch(() => setError('โหลดโต๊ะไม่สำเร็จ'));
  }, []);

  useEffect(() => reload(), [reload]);

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!number.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createTable(number.trim());
      setNumber('');
      reload();
    } catch (err) {
      setError(errMsg(err, 'เพิ่มโต๊ะไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number): Promise<void> {
    setError(null);
    try {
      await deleteTable(id);
      reload();
    } catch (err) {
      setError(errMsg(err, 'ลบโต๊ะไม่สำเร็จ'));
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-bold">โต๊ะ ({tables.length})</h2>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="หมายเลขโต๊ะ เช่น 11"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          เพิ่มโต๊ะ
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {tables.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
          >
            <span className="font-semibold">{t.tableNumber}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="text-sm text-rose-500 hover:text-rose-700"
              title="ลบโต๊ะ"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        * ลบได้เฉพาะโต๊ะที่ยังไม่เคยมีบิล
      </p>
    </section>
  );
}
