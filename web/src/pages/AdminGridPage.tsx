import { useCallback, useEffect, useState } from 'react';
import {
  ackServiceRequest,
  checkoutTable,
  fetchTables,
  openTable,
} from '../services/staffApi';
import { useStaffSocket } from '../hooks/useStaffSocket';
import { useToastStore } from '../store/toastStore';
import { SOCKET_EVENTS } from '../services/socket';
import { formatBaht } from '../utils/money';
import { printReceipt } from '../utils/printReceipt';
import type { CheckoutPayload, TableGridItem } from '../type/staff';
import { TableCard } from '../components/TableCard';
import { QrModal } from '../components/QrModal';
import { CheckoutConfirmModal } from '../components/CheckoutConfirmModal';
import { TableBillModal } from '../components/TableBillModal';

interface QrTarget {
  tableNumber: string;
  url: string;
}

interface CheckoutTarget {
  tableId: number;
  tableNumber: string;
  total: number; // สตางค์ — ยอดล่าสุดจาก grid
}

// สร้างลิงก์ลูกค้าจากโต๊ะที่เปิดอยู่ (ไม่ต้องเรียก API ใหม่)
function buildCustomerUrl(table: TableGridItem): string | null {
  const token = table.bills[0]?.qrToken;
  if (!token) return null;
  return `${window.location.origin}/table/${table.id}?token=${token}`;
}

export function AdminGridPage() {
  const [tables, setTables] = useState<TableGridItem[]>([]);
  const [qr, setQr] = useState<QrTarget | null>(null);
  const [checkout, setCheckout] = useState<CheckoutTarget | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [billModal, setBillModal] = useState<{
    tableId: number;
    tableNumber: string;
  } | null>(null);
  const push = useToastStore((s) => s.push);

  const reload = useCallback(() => {
    fetchTables()
      .then(setTables)
      .catch(() => push('โหลดผังโต๊ะไม่สำเร็จ', 'error'));
  }, [push]);

  useEffect(() => {
    reload();
  }, [reload]);

  // เสียง/แจ้งเตือนจัดการที่ StaffLayout (ทำงานทุกหน้า) — ที่นี่แค่รีโหลดข้อมูล
  useStaffSocket({
    [SOCKET_EVENTS.serviceRequestCreated]: () => reload(),
    [SOCKET_EVENTS.orderCreated]: () => reload(),
    [SOCKET_EVENTS.tableOpened]: () => reload(),
    [SOCKET_EVENTS.billClosed]: () => reload(),
  });

  async function handleOpen(tableId: number): Promise<void> {
    try {
      const result = await openTable(tableId);
      setQr({ tableNumber: result.table.tableNumber, url: result.customerUrl }); // เด้ง QR ให้ลูกค้าสแกน
      push(`เปิดโต๊ะ ${result.table.tableNumber} แล้ว`, 'success');
      reload();
    } catch {
      push('เปิดโต๊ะไม่สำเร็จ (อาจมีบิลเปิดอยู่)', 'error');
    }
  }

  // กดเช็คบิล -> เปิด modal ยืนยันก่อน (ยอดเอาจากผัง grid ล่าสุด)
  function handleCheckout(tableId: number): void {
    const table = tables.find((t) => t.id === tableId);
    setCheckout({
      tableId,
      tableNumber: table?.tableNumber ?? String(tableId),
      total: table?.bills[0]?.totalPrice ?? 0,
    });
  }

  // ยืนยันแล้ว -> ปิดบิลจริง + พิมพ์ใบเสร็จ
  async function confirmCheckout(payload: CheckoutPayload): Promise<void> {
    if (!checkout) return;
    setCheckingOut(true);
    try {
      const bill = await checkoutTable(checkout.tableId, payload);
      printReceipt(bill);
      push(`เช็คบิลแล้ว · ${formatBaht(bill.totalPrice ?? 0)}`, 'success');
      setCheckout(null);
      reload();
    } catch {
      push('เช็คบิลไม่สำเร็จ', 'error');
    } finally {
      setCheckingOut(false);
    }
  }

  function handleShowQr(table: TableGridItem): void {
    const url = buildCustomerUrl(table);
    if (!url) {
      push('ไม่พบลิงก์ QR ของโต๊ะนี้', 'error');
      return;
    }
    setQr({ tableNumber: table.tableNumber, url });
  }

  function handleOpenBill(table: TableGridItem): void {
    setBillModal({ tableId: table.id, tableNumber: table.tableNumber });
  }

  async function handleAck(srId: number): Promise<void> {
    try {
      await ackServiceRequest(srId);
      push('รับเรื่องแล้ว', 'success');
      reload();
    } catch {
      push('รับเรื่องไม่สำเร็จ', 'error');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">ผังโต๊ะ</h1>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onOpen={handleOpen}
            onCheckout={handleCheckout}
            onAck={handleAck}
            onShowQr={handleShowQr}
            onOpenBill={handleOpenBill}
          />
        ))}
      </div>

      {qr && (
        <QrModal
          tableNumber={qr.tableNumber}
          url={qr.url}
          onClose={() => setQr(null)}
        />
      )}

      {checkout && (
        <CheckoutConfirmModal
          tableNumber={checkout.tableNumber}
          subtotal={checkout.total}
          busy={checkingOut}
          onConfirm={confirmCheckout}
          onCancel={() => setCheckout(null)}
        />
      )}

      {billModal && (
        <TableBillModal
          tableId={billModal.tableId}
          tableNumber={billModal.tableNumber}
          vacantTables={tables
            .filter((t) => t.status === 'vacant')
            .map((t) => ({ id: t.id, tableNumber: t.tableNumber }))}
          onClose={() => {
            setBillModal(null);
            reload(); // อัปเดตยอดในผังโต๊ะหลังปิด
          }}
          onTransferred={() => {
            setBillModal(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
