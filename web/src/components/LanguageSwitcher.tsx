import { LANGS, useLangStore } from '../i18n';

// ปุ่มสลับภาษา (ไทย/EN/中文) ฝั่งลูกค้า — ออกแบบให้วางบน header สีส้มได้
export function LanguageSwitcher() {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  return (
    <div className="inline-flex rounded-full border border-white/30 bg-white/15 p-0.5 backdrop-blur">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            lang === l.code ? 'bg-white text-orange-600' : 'text-white/85'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
