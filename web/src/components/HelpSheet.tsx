import { useT } from '../i18n';
import type { StringKey } from '../i18n';

interface HelpSheetProps {
  open: boolean;
  onClose: () => void;
}

// คำแนะนำวิธีสั่งอาหารฝั่งลูกค้า — รองรับ ไทย/EN/中文 ผ่าน i18n
const STEP_KEYS: StringKey[] = ['helpStep1', 'helpStep2', 'helpStep3', 'helpStep4'];

export function HelpSheet({ open, onClose }: HelpSheetProps) {
  const t = useT();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mx-auto max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-warm p-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">❓ {t('helpTitle')}</h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-slate-400">
            {t('close')}
          </button>
        </div>

        <ol className="space-y-3">
          {STEP_KEYS.map((key, i) => (
            <li key={key} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm text-slate-700">{t(key)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
