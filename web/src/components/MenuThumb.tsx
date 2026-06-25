import { mediaUrl } from '../services/api';

interface MenuThumbProps {
  imageUrl: string | null;
  alt?: string;
  className?: string;
}

// รูปเมนู — ถ้าไม่มีรูปแสดง placeholder แบบ static (ไอคอนจานอาหาร)
export function MenuThumb({ imageUrl, alt, className = '' }: MenuThumbProps) {
  const src = mediaUrl(imageUrl);
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-orange-50 ${className}`}
    >
      {src ? (
        <img src={src} alt={alt ?? ''} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xl opacity-40" aria-hidden>
          🍽️
        </span>
      )}
    </div>
  );
}
