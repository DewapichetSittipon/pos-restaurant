// ชื่อแปลหลายภาษา (อังกฤษ/จีน) — ใช้ร่วมกับ field name ภาษาไทยที่เป็นค่าหลัก
// เก็บใน DB เป็น null เมื่อว่าง เพื่อให้ฝั่งลูกค้า fallback ไปไทยได้สม่ำเสมอ
export interface TranslatedNameInput {
  nameEn?: string | null;
  nameZh?: string | null;
}

// trim แล้วแปลงค่าว่างเป็น null (กันไม่ให้เก็บ "" ที่ทำให้ fallback ไม่ทำงาน)
function blankToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

// คืน { nameEn, nameZh } ที่ normalize แล้ว พร้อมยัดลง Prisma data ได้เลย
// ใช้ตอน create (เซตทั้งสองฟิลด์เสมอ)
export function translatedNames(input: TranslatedNameInput): {
  nameEn: string | null;
  nameZh: string | null;
} {
  return {
    nameEn: blankToNull(input.nameEn),
    nameZh: blankToNull(input.nameZh),
  };
}

// เวอร์ชัน partial สำหรับ update — รวมเฉพาะฟิลด์ที่ถูกส่งมา (undefined = ไม่แตะ)
// กัน toggle บางส่วน (เช่นส่งแค่ isAvailable) ไปลบชื่อแปลที่มีอยู่
export function translatedNamesPartial(input: TranslatedNameInput): {
  nameEn?: string | null;
  nameZh?: string | null;
} {
  const data: { nameEn?: string | null; nameZh?: string | null } = {};
  if (input.nameEn !== undefined) data.nameEn = blankToNull(input.nameEn);
  if (input.nameZh !== undefined) data.nameZh = blankToNull(input.nameZh);
  return data;
}
