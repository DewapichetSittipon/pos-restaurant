import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useCustomerSession } from '../hooks/useCustomerSession';
import { useMenu } from '../hooks/useMenu';
import { useSessionStore } from '../store/sessionStore';
import {
  useCartStore,
  selectTotalPrice,
  selectTotalQuantity,
} from '../store/cartStore';
import { submitOrder, requestService } from '../services/customerApi';
import type { MenuItem, ServiceRequestType } from '../type/domain';
import { CategoryTabs } from '../components/CategoryTabs';
import { MenuCard } from '../components/MenuCard';
import { OrderSheet } from '../components/OrderSheet';
import { CartBar } from '../components/CartBar';
import { CartDrawer } from '../components/CartDrawer';
import { CenterMessage } from '../components/CenterMessage';

export function TablePage() {
  const { tableId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const numericTableId = Number(tableId);

  const validParams = Boolean(token) && Number.isInteger(numericTableId);

  return validParams ? (
    <TableContent tableId={numericTableId} token={token} />
  ) : (
    <CenterMessage
      icon="⚠️"
      title="ลิงก์ไม่ถูกต้อง"
      detail="กรุณาสแกน QR ที่โต๊ะอีกครั้ง"
    />
  );
}

interface TableContentProps {
  tableId: number;
  token: string;
}

function TableContent({ tableId, token }: TableContentProps) {
  useCustomerSession(tableId, token);

  const status = useSessionStore((s) => s.status);
  const session = useSessionStore((s) => s.session);
  const { categories, loading: menuLoading } = useMenu();

  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clear);
  const cartLines = useCartStore((s) => s.lines);
  const totalQty = useCartStore(selectTotalQuantity);
  const totalPrice = useCartStore(selectTotalPrice);

  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const orderCount = session?.orderItems.length ?? 0;

  const activeId = selectedCat ?? categories[0]?.id ?? 0;
  const activeMenus = useMemo<MenuItem[]>(
    () => categories.find((c) => c.id === activeId)?.menus ?? [],
    [categories, activeId],
  );

  function flash(message: string): void {
    setBanner(message);
    window.setTimeout(() => setBanner(null), 2500);
  }

  async function handleSubmit(): Promise<void> {
    setSubmitting(true);
    try {
      await submitOrder({
        items: cartLines.map((l) => ({ menuId: l.menuId, quantity: l.quantity })),
      });
      clearCart();
      setCartOpen(false);
      flash('ส่งออเดอร์เรียบร้อย ✓');
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'ส่งออเดอร์ไม่สำเร็จ';
      flash(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleService(type: ServiceRequestType): Promise<void> {
    setOrderOpen(false); // ปิด sheet เพื่อให้เห็น banner ยืนยัน
    try {
      await requestService({ type });
      flash(type === 'call_bill' ? 'เรียกเช็คบิลแล้ว ✓' : 'เรียกพนักงานแล้ว ✓');
    } catch {
      flash('ส่งคำขอไม่สำเร็จ');
    }
  }

  if (status === 'loading') {
    return <CenterMessage title="กำลังโหลด..." />;
  }
  if (status === 'invalid') {
    return (
      <CenterMessage
        icon="🔒"
        title="เซสชันไม่ถูกต้อง"
        detail="บิลนี้อาจถูกปิดแล้ว กรุณาเรียกพนักงาน"
      />
    );
  }
  if (status === 'closed') {
    return (
      <CenterMessage
        icon="✅"
        title="ปิดบิลเรียบร้อย"
        detail="ขอบคุณที่ใช้บริการ"
      />
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-warm px-4 pb-28">
      <header className="-mx-4 mb-4 bg-linear-to-br from-orange-500 to-rose-500 px-4 pb-7 pt-6 text-white shadow-lg shadow-orange-500/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/75">
              ยินดีต้อนรับ
            </p>
            <h1 className="text-2xl font-bold">โต๊ะ {session?.table.tableNumber}</h1>
            <p className="mt-0.5 text-sm text-white/85">เลือกเมนูแล้วกดสั่งได้เลย</p>
          </div>
          <button
            type="button"
            onClick={() => setOrderOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur active:scale-95"
          >
            🧾 รายการ
            {orderCount > 0 && (
              <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-white px-1 text-xs font-bold text-orange-600">
                {orderCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {banner && (
        <div className="sticky top-2 z-20 mb-3 rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg">
          {banner}
        </div>
      )}

      {!menuLoading && categories.length > 0 && (
        <CategoryTabs
          categories={categories}
          activeId={activeId}
          onSelect={setSelectedCat}
        />
      )}

      <section className="mt-4 space-y-3">
        {activeMenus.map((menu) => (
          <MenuCard key={menu.id} menu={menu} onAdd={addItem} />
        ))}
      </section>

      <CartBar quantity={totalQty} total={totalPrice} onOpen={() => setCartOpen(true)} />
      <CartDrawer
        open={cartOpen}
        submitting={submitting}
        onClose={() => setCartOpen(false)}
        onSubmit={handleSubmit}
      />
      <OrderSheet
        open={orderOpen}
        items={session?.orderItems ?? []}
        onClose={() => setOrderOpen(false)}
        onRequest={handleService}
      />
    </div>
  );
}
