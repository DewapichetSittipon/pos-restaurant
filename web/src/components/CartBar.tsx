import { formatBaht } from '../utils/money';

interface CartBarProps {
  quantity: number;
  total: number;
  onOpen: () => void;
}

export function CartBar({ quantity, total, onOpen }: CartBarProps) {
  if (quantity === 0) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center justify-between bg-linear-to-r from-orange-500 to-rose-500 px-5 py-4 text-white shadow-[0_-4px_20px_-4px_rgba(249,115,22,0.5)] active:brightness-95"
    >
      <span className="flex items-center gap-2 font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/25 text-sm font-bold">
          {quantity}
        </span>
        ดูตะกร้า
      </span>
      <span className="flex items-center gap-1.5 font-bold">
        {formatBaht(total)}
        <span aria-hidden>→</span>
      </span>
    </button>
  );
}
