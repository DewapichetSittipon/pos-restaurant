import { useToastStore } from '../store/toastStore';
import type { ToastKind } from '../type/staff';

const KIND_STYLES: Record<ToastKind, string> = {
  info: 'bg-slate-900',
  success: 'bg-emerald-600',
  error: 'bg-rose-600 ring-2 ring-rose-300',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => remove(t.id)}
          className={`w-full max-w-sm rounded-lg px-4 py-3 text-left text-sm font-medium text-white shadow-lg ${KIND_STYLES[t.kind]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
