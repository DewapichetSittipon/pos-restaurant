import type { TableGridItem } from '../type/staff';
import { formatBaht } from '../utils/money';

interface TableCardProps {
  table: TableGridItem;
  onOpen: (tableId: number) => void;
  onCheckout: (tableId: number) => void;
  onAck: (serviceRequestId: number) => void;
  onShowQr: (table: TableGridItem) => void;
  onAddItems: (table: TableGridItem) => void;
}

const SR_LABEL: Record<string, string> = {
  call_staff: '🔔 เรียกพนักงาน',
  call_bill: '🧾 เรียกเช็คบิล',
};

type Theme = {
  chair: string;
  top: string;
  ring: string;
  number: string;
};

function chairs(count: number, cls: string) {
  return Array.from({ length: count }, (_, i) => (
    <span key={i} className={`h-2.5 w-7 rounded-full ${cls}`} />
  ));
}

export function TableCard({
  table,
  onOpen,
  onCheckout,
  onAck,
  onShowQr,
  onAddItems,
}: TableCardProps) {
  const bill = table.bills[0]; // มีได้ทีละหนึ่งบิล pending
  const requests = bill?.serviceRequests ?? [];
  const occupied = table.status === 'occupied';
  const alert = requests.length > 0;

  const theme: Theme = alert
    ? {
        chair: 'bg-rose-400',
        top: 'border-rose-400 bg-rose-50',
        ring: 'ring-rose-200',
        number: 'text-rose-700',
      }
    : occupied
      ? {
          chair: 'bg-indigo-400',
          top: 'border-indigo-300 bg-indigo-50',
          ring: 'ring-indigo-100',
          number: 'text-indigo-700',
        }
      : {
          chair: 'bg-slate-300',
          top: 'border-slate-200 bg-white',
          ring: 'ring-slate-100',
          number: 'text-slate-700',
        };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* ภาพโต๊ะ + เก้าอี้ */}
      <div className={`w-full ${alert ? 'animate-pulse' : ''}`}>
        {/* เก้าอี้แถวบน */}
        <div className="mb-1.5 flex justify-center gap-3">{chairs(2, theme.chair)}</div>

        <div className="flex items-stretch justify-center gap-1.5">
          {/* เก้าอี้ซ้าย */}
          <span className={`my-auto h-7 w-2.5 rounded-full ${theme.chair}`} />

          {/* หน้าโต๊ะ */}
          <div
            className={`flex flex-1 flex-col items-center justify-center rounded-2xl border-2 px-3 py-5 shadow-sm ring-4 ${theme.top} ${theme.ring}`}
          >
            <span className={`text-3xl font-extrabold leading-none ${theme.number}`}>
              {table.tableNumber}
            </span>
            <span
              className={`mt-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                occupied
                  ? 'bg-indigo-200 text-indigo-800'
                  : 'bg-emerald-200 text-emerald-800'
              }`}
            >
              {occupied ? 'มีลูกค้า' : 'ว่าง'}
            </span>
            {occupied && bill?.totalPrice != null && (
              <span className="mt-1 text-xs font-medium text-slate-500">
                {formatBaht(bill.totalPrice)}
              </span>
            )}
          </div>

          {/* เก้าอี้ขวา */}
          <span className={`my-auto h-7 w-2.5 rounded-full ${theme.chair}`} />
        </div>

        {/* เก้าอี้แถวล่าง */}
        <div className="mt-1.5 flex justify-center gap-3">{chairs(2, theme.chair)}</div>
      </div>

      {/* คำขอบริการ */}
      {requests.map((sr) => (
        <button
          key={sr.id}
          type="button"
          onClick={() => onAck(sr.id)}
          className="w-full rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
        >
          {SR_LABEL[sr.type] ?? sr.type} · แตะเพื่อรับเรื่อง
        </button>
      ))}

      {/* ปุ่มจัดการ */}
      {occupied ? (
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => onAddItems(table)}
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white"
          >
            + เพิ่มรายการ
          </button>
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={() => onShowQr(table)}
              className="flex-1 rounded-lg border border-indigo-200 bg-white py-2 text-sm font-semibold text-indigo-700"
            >
              ดู QR
            </button>
            <button
              type="button"
              onClick={() => onCheckout(table.id)}
              className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white"
            >
              เช็คบิล
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(table.id)}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white"
        >
          เปิดโต๊ะ
        </button>
      )}
    </div>
  );
}
