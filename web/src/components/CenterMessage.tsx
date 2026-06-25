import type { ReactNode } from 'react';

interface CenterMessageProps {
  icon?: string;
  title: string;
  detail?: ReactNode;
}

export function CenterMessage({ icon, title, detail }: CenterMessageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-warm px-8 text-center">
      {icon && (
        <div className="grid h-20 w-20 place-items-center rounded-full bg-linear-to-br from-orange-100 to-rose-100 text-4xl shadow-sm ring-1 ring-orange-200/60">
          {icon}
        </div>
      )}
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      {detail && <p className="text-slate-500">{detail}</p>}
    </div>
  );
}
