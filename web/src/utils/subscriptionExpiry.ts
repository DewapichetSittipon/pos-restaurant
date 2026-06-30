// จำนวนวันที่เหลือถึงหมดอายุแพ็กเกจ (ปัดขึ้น) — null ถ้าไม่มีวันหมด, ติดลบ = หมดแล้ว
export function daysUntilExpiry(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

// ใกล้หมด = เหลือ ≤ 7 วัน (รวมหมดแล้ว) — ใช้เตือน + เปลี่ยนสี badge
export function isExpiringSoon(iso: string | null): boolean {
  const d = daysUntilExpiry(iso);
  return d !== null && d <= 7;
}
