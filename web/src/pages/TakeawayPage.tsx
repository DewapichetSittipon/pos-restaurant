import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addOrderToBill,
  checkoutTakeawayBill,
  createTakeawayBill,
  fetchTakeawayBills,
} from '../services/staffApi';
import type { CreateTakeawayInput } from '../services/staffApi';
import { fetchShop, fetchCatalog } from '../services/manageApi';
import { useToastStore } from '../store/toastStore';
import { formatBaht } from '../utils/money';
import { printReceipt } from '../utils/printReceipt';
import { MenuCard } from '../components/MenuCard';
import { ModifierPicker } from '../components/ModifierPicker';
import { CategoryTabs } from '../components/CategoryTabs';
import { CheckoutConfirmModal } from '../components/CheckoutConfirmModal';
import type { Category, MenuItem, ModifierOption } from '../type/domain';
import type { CheckoutPayload, TakeawayBill } from '../type/staff';

interface LocalLine {
  lineId: string;
  menuId: number;
  name: string;
  price: number; // ต่อหน่วย รวมตัวเลือก
  quantity: number;
  selectedOptionIds: number[];
  modifiers: { name: string }[];
}

const TYPE_LABEL: Record<string, string> = {
  takeaway: 'กลับบ้าน',
  delivery: 'เดลิเวอรี',
};

export function TakeawayPage() {
  const [bills, setBills] = useState<TakeawayBill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [charges, setCharges] = useState({
    vatRate: 0,
    vatInclusive: true,
    serviceChargeRate: 0,
  });
  const [promptpayId, setPromptpayId] = useState<string | null>(null);
  const [loyaltyEarnRate, setLoyaltyEarnRate] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [addTarget, setAddTarget] = useState<TakeawayBill | null>(null);
  const [checkoutTarget, setCheckoutTarget] = useState<TakeawayBill | null>(null);
  const [busy, setBusy] = useState(false);
  const push = useToastStore((s) => s.push);

  const reload = useCallback(() => {
    fetchTakeawayBills()
      .then(setBills)
      .catch(() => push('โหลดบิลไม่สำเร็จ', 'error'));
  }, [push]);

  useEffect(() => {
    reload();
    fetchCatalog().then(setCategories).catch(() => undefined);
    fetchShop()
      .then((s) => {
        setCharges({
          vatRate: s.vatRate,
          vatInclusive: s.vatInclusive,
          serviceChargeRate: s.serviceChargeRate,
        });
        setPromptpayId(s.promptpayId);
        setLoyaltyEarnRate(s.loyaltyEarnRate);
      })
      .catch(() => undefined);
  }, [reload]);

  async function handleCheckout(payload: CheckoutPayload): Promise<void> {
    if (!checkoutTarget) return;
    setBusy(true);
    try {
      const result = await checkoutTakeawayBill(checkoutTarget.id, payload);
      await printReceipt(result);
      setCheckoutTarget(null);
      reload();
      push('เช็คบิลเรียบร้อย', 'success');
    } catch {
      push('เช็คบิลไม่สำเร็จ', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">🛍️ กลับบ้าน / เดลิเวอรี</h1>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="rounded-xl bg-linear-to-r from-orange-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white"
        >
          + เปิดบิลใหม่
        </button>
      </div>

      {bills.length === 0 ? (
        <p className="py-12 text-center text-slate-400">ยังไม่มีบิลที่เปิดอยู่</p>
      ) : (
        <ul className="space-y-3">
          {bills.map((b) => {
            const items = b.orderItems.filter((i) => i.status !== 'voided');
            const count = items.reduce((s, i) => s + i.quantity, 0);
            return (
              <li
                key={b.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      {TYPE_LABEL[b.orderType] ?? b.orderType}
                    </span>
                    <p className="mt-1 font-semibold">
                      {b.customerName || `บิล #${b.id}`}
                    </p>
                    {b.customerPhone && (
                      <p className="text-xs text-slate-500">📞 {b.customerPhone}</p>
                    )}
                    {b.deliveryAddress && (
                      <p className="text-xs text-slate-500">📍 {b.deliveryAddress}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">
                      {formatBaht(b.totalPrice ?? 0)}
                    </p>
                    <p className="text-xs text-slate-400">{count} รายการ</p>
                    {b.deliveryFee > 0 && (
                      <p className="text-xs text-slate-400">
                        +ค่าส่ง {formatBaht(b.deliveryFee)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAddTarget(b)}
                    className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700"
                  >
                    + เพิ่มรายการ
                  </button>
                  <button
                    type="button"
                    disabled={count === 0}
                    onClick={() => setCheckoutTarget(b)}
                    className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    เช็คบิล
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showNew && (
        <NewBillForm
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            reload();
          }}
        />
      )}

      {addTarget && (
        <AddItemsModal
          bill={addTarget}
          categories={categories}
          onClose={() => setAddTarget(null)}
          onAdded={() => {
            setAddTarget(null);
            reload();
          }}
        />
      )}

      {checkoutTarget && (
        <CheckoutConfirmModal
          tableNumber=""
          label={TYPE_LABEL[checkoutTarget.orderType] ?? ''}
          subtotal={checkoutTarget.totalPrice ?? 0}
          charges={charges}
          loyaltyEarnRate={loyaltyEarnRate}
          promptpayId={promptpayId}
          deliveryFee={checkoutTarget.deliveryFee}
          busy={busy}
          onConfirm={handleCheckout}
          onCancel={() => setCheckoutTarget(null)}
        />
      )}
    </div>
  );
}

// ---- ฟอร์มเปิดบิลใหม่ ----
function NewBillForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<CreateTakeawayInput['orderType']>('takeaway');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [feeBaht, setFeeBaht] = useState('');
  const [busy, setBusy] = useState(false);
  const push = useToastStore((s) => s.push);

  async function submit(): Promise<void> {
    setBusy(true);
    try {
      await createTakeawayBill({
        orderType: type,
        customerName: name.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        deliveryAddress: type === 'delivery' ? address.trim() || undefined : undefined,
        deliveryFee:
          type === 'delivery' && feeBaht
            ? Math.round(parseFloat(feeBaht) * 100)
            : undefined,
      });
      onCreated();
    } catch {
      push('เปิดบิลไม่สำเร็จ', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="mb-3 font-bold">เปิดบิลใหม่</h3>
        <div className="mb-3 flex gap-2">
          {(['takeaway', 'delivery'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                type === t ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อลูกค้า (ถ้ามี)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="เบอร์โทร (ถ้ามี)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          {type === 'delivery' && (
            <>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ที่อยู่จัดส่ง"
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <label className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-500">ค่าส่ง (บาท)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={feeBaht}
                  onChange={(e) => setFeeBaht(e.target.value)}
                  placeholder="0"
                  className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-right"
                />
              </label>
            </>
          )}
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
            onClick={submit}
            className="flex-1 rounded-xl bg-linear-to-r from-orange-500 to-rose-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? 'กำลังเปิด...' : 'เปิดบิล'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- โมดอลเพิ่มรายการเข้าบิล (มี cart ภายในตัว) ----
function AddItemsModal({
  bill,
  categories,
  onClose,
  onAdded,
}: {
  bill: TakeawayBill;
  categories: Category[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [lines, setLines] = useState<LocalLine[]>([]);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [pickerMenu, setPickerMenu] = useState<MenuItem | null>(null);
  const [busy, setBusy] = useState(false);
  const push = useToastStore((s) => s.push);

  const activeId = activeCat ?? categories[0]?.id ?? 0;
  const menus = useMemo(
    () => categories.find((c) => c.id === activeId)?.menus ?? [],
    [categories, activeId],
  );
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  function addOptions(menu: MenuItem, options: ModifierOption[]): void {
    const delta = options.reduce((s, o) => s + o.priceDelta, 0);
    setLines((ls) => [
      ...ls,
      {
        lineId: crypto.randomUUID(),
        menuId: menu.id,
        name: menu.name,
        price: menu.price + delta,
        quantity: 1,
        selectedOptionIds: options.map((o) => o.id),
        modifiers: options.map((o) => ({ name: o.name })),
      },
    ]);
  }

  function handleAdd(menu: MenuItem): void {
    if (menu.modifierGroups && menu.modifierGroups.length > 0) {
      setPickerMenu(menu);
    } else {
      addOptions(menu, []);
    }
  }

  async function submit(): Promise<void> {
    if (lines.length === 0) return;
    setBusy(true);
    try {
      await addOrderToBill(
        bill.id,
        lines.map((l) => ({
          menuId: l.menuId,
          quantity: l.quantity,
          modifierOptionIds: l.selectedOptionIds.length
            ? l.selectedOptionIds
            : undefined,
        })),
      );
      onAdded();
    } catch {
      push('เพิ่มรายการไม่สำเร็จ', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mx-auto mt-auto flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl bg-warm">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-bold">เพิ่มรายการ · {bill.customerName || `#${bill.id}`}</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-400">
            ปิด
          </button>
        </div>

        {categories.length > 0 && (
          <CategoryTabs
            categories={categories}
            activeId={activeId}
            onSelect={setActiveCat}
          />
        )}

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {menus.map((m) => (
            <MenuCard key={m.id} menu={m} onAdd={handleAdd} />
          ))}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-slate-200 bg-white p-3 text-sm">
            <ul className="mb-2 max-h-28 space-y-1 overflow-y-auto">
              {lines.map((l) => (
                <li key={l.lineId} className="flex justify-between">
                  <span className="truncate">
                    {l.name}
                    {l.modifiers.length > 0 && (
                      <span className="text-xs text-slate-400">
                        {' '}
                        ({l.modifiers.map((m) => m.name).join(', ')})
                      </span>
                    )}{' '}
                    ×{l.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLines((ls) => ls.filter((x) => x.lineId !== l.lineId))
                    }
                    className="ml-2 text-slate-400"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="w-full rounded-xl bg-linear-to-r from-orange-500 to-rose-500 py-3 font-bold text-white disabled:opacity-50"
            >
              {busy ? 'กำลังเพิ่ม...' : `ยืนยันเพิ่ม · ${formatBaht(total)}`}
            </button>
          </div>
        )}

        <ModifierPicker
          menu={pickerMenu}
          onClose={() => setPickerMenu(null)}
          onConfirm={(menu, options) => {
            addOptions(menu, options);
            setPickerMenu(null);
          }}
        />
      </div>
    </div>
  );
}
