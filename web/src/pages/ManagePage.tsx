import { useState } from 'react';
import { ManageTables } from '../components/manage/ManageTables';
import { ManageCategories } from '../components/manage/ManageCategories';
import { ManageMenus } from '../components/manage/ManageMenus';
import { ManageShop } from '../components/manage/ManageShop';
import { ManageAccount } from '../components/manage/ManageAccount';
import { ManageStaff } from '../components/manage/ManageStaff';

type Tab = 'tables' | 'categories' | 'menus' | 'shop' | 'staff' | 'account';

const TABS: { key: Tab; label: string }[] = [
  { key: 'tables', label: 'โต๊ะ' },
  { key: 'categories', label: 'หมวดหมู่' },
  { key: 'menus', label: 'เมนู' },
  { key: 'shop', label: 'ข้อมูลร้าน' },
  { key: 'staff', label: 'พนักงาน' },
  { key: 'account', label: 'บัญชี' },
];

export function ManagePage() {
  const [tab, setTab] = useState<Tab>('tables');

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">จัดการร้าน</h1>

      <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tables' && <ManageTables />}
      {tab === 'categories' && <ManageCategories />}
      {tab === 'menus' && <ManageMenus />}
      {tab === 'shop' && <ManageShop />}
      {tab === 'staff' && <ManageStaff />}
      {tab === 'account' && <ManageAccount />}
    </div>
  );
}
