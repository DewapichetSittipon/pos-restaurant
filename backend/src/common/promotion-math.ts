// สูตรประเมินโปรโมชัน (rule-based discount) — เก็บเงินเป็น integer สตางค์
// เงื่อนไขทั้งหมดต้องผ่านพร้อมกันจึงจะใช้โปรได้ แล้วคิดส่วนลดตาม type
// ⚠️ ทุกการเทียบเวลา/วันใช้ "เวลาไทย" (Asia/Bangkok = UTC+7, ไม่มี DST)

export type PromotionType = 'percent' | 'amount' | 'bogo';

// รูปโปรโมชันที่ใช้ประเมิน (subset ของ Prisma model — ไม่ผูก Prisma เพื่อ test ง่าย)
export interface PromotionRule {
  type: PromotionType;
  value: number; // percent → basis points (1000 = 10%); amount → สตางค์
  minSubtotal: number; // สตางค์ ยอดขั้นต่ำ (0 = ไม่จำกัด)
  maxDiscount: number | null; // สตางค์ เพดานส่วนลด เฉพาะ percent (null = ไม่จำกัด)
  startMinute: number | null; // นาทีจากเที่ยงคืน 0–1439 (เวลาไทย)
  endMinute: number | null;
  daysOfWeek: number; // bitmask bit0=อาทิตย์ … bit6=เสาร์ (127 = ทุกวัน)
  buyQty: number; // BOGO
  getQty: number; // BOGO
  membersOnly: boolean;
  birthdayOnly: boolean;
  isActive: boolean;
}

// บริบทของบิลตอนเช็คบิล
export interface PromotionContext {
  subtotal: number; // สตางค์ ยอดรวมรายการที่ยังไม่ยกเลิก
  // ราคาต่อหน่วยของทุกชิ้น (กระจาย quantity ออกแล้ว) — ใช้คิด BOGO; ไม่ต้องเรียงมา
  unitPrices: number[];
  hasMember: boolean; // บิลผูกสมาชิกหรือไม่ (membersOnly)
  isMemberBirthday: boolean; // วันนี้ตรงวันเกิดสมาชิกหรือไม่ (birthdayOnly)
  now: Date; // เวลาปัจจุบัน (UTC instant) — แปลงเป็นเวลาไทยภายใน
}

// แตกเวลา UTC instant → ส่วนประกอบตาม "เวลาไทย" (UTC+7) โดยไม่พึ่ง timezone ของ server
export function bangkokParts(now: Date): {
  dayOfWeek: number; // 0=อาทิตย์ … 6=เสาร์
  minuteOfDay: number; // 0–1439
  month: number; // 1–12
  day: number; // 1–31
} {
  const bkk = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return {
    dayOfWeek: bkk.getUTCDay(),
    minuteOfDay: bkk.getUTCHours() * 60 + bkk.getUTCMinutes(),
    month: bkk.getUTCMonth() + 1,
    day: bkk.getUTCDate(),
  };
}

// วันนี้ (เวลาไทย) ตรงวัน/เดือนเกิดของสมาชิกหรือไม่ (ไม่สนปี)
export function isBirthdayToday(birthDate: Date | null, now: Date): boolean {
  if (!birthDate) return false;
  const today = bangkokParts(now);
  // birthDate เก็บเป็นวันที่ (UTC midnight) — อ่าน วัน/เดือน แบบ UTC ให้ตรงกับที่บันทึก
  return (
    birthDate.getUTCMonth() + 1 === today.month &&
    birthDate.getUTCDate() === today.day
  );
}

// เช็คว่านาทีปัจจุบันอยู่ในช่วง [start, end] หรือไม่ (รองรับช่วงข้ามเที่ยงคืน start>end)
function withinWindow(
  minuteOfDay: number,
  start: number | null,
  end: number | null,
): boolean {
  if (start == null || end == null) return true; // ไม่กำหนด = ทั้งวัน
  if (start <= end) return minuteOfDay >= start && minuteOfDay <= end;
  // ข้ามเที่ยงคืน เช่น 22:00–02:00
  return minuteOfDay >= start || minuteOfDay <= end;
}

// ส่วนลด BOGO: ซื้อครบ (buy+get) ต่อรอบ → ชิ้นที่ถูกที่สุด get ชิ้นต่อรอบฟรี
// เลือกชิ้นถูกสุดเป็นของแถมเพื่อให้ส่วนลดสมเหตุผล (ลูกค้าจ่ายของแพงกว่า)
function bogoDiscount(unitPrices: number[], buyQty: number, getQty: number): number {
  if (buyQty <= 0 || getQty <= 0) return 0;
  const perRound = buyQty + getQty;
  const rounds = Math.floor(unitPrices.length / perRound);
  if (rounds <= 0) return 0;
  const freeCount = rounds * getQty;
  const ascending = [...unitPrices].sort((a, b) => a - b);
  let discount = 0;
  for (let i = 0; i < freeCount; i++) discount += ascending[i];
  return discount;
}

// ประเมินโปรหนึ่งตัวกับบิล → คืนส่วนลด (สตางค์); 0 = ใช้ไม่ได้/ไม่ได้ส่วนลด
export function evaluatePromotion(
  promo: PromotionRule,
  ctx: PromotionContext,
): number {
  if (!promo.isActive) return 0;
  if (promo.membersOnly && !ctx.hasMember) return 0;
  if (promo.birthdayOnly && !ctx.isMemberBirthday) return 0;
  if (ctx.subtotal < promo.minSubtotal) return 0;

  const { dayOfWeek, minuteOfDay } = bangkokParts(ctx.now);
  if ((promo.daysOfWeek & (1 << dayOfWeek)) === 0) return 0;
  if (!withinWindow(minuteOfDay, promo.startMinute, promo.endMinute)) return 0;

  let discount = 0;
  switch (promo.type) {
    case 'percent': {
      discount = Math.floor((ctx.subtotal * Math.max(promo.value, 0)) / 10000);
      if (promo.maxDiscount != null) {
        discount = Math.min(discount, promo.maxDiscount);
      }
      break;
    }
    case 'amount':
      discount = Math.max(promo.value, 0);
      break;
    case 'bogo':
      discount = bogoDiscount(ctx.unitPrices, promo.buyQty, promo.getQty);
      break;
  }
  // ส่วนลดไม่เกินยอดรวม
  return Math.min(Math.max(discount, 0), ctx.subtotal);
}

// เลือกโปรที่ดีที่สุด (ส่วนลดมากสุด; เสมอกันเลือก priority สูงกว่า) จากรายการที่เข้าเงื่อนไข
export function pickBestPromotion<T extends PromotionRule & { priority: number }>(
  promos: T[],
  ctx: PromotionContext,
): { promo: T; discount: number } | null {
  let best: { promo: T; discount: number } | null = null;
  for (const promo of promos) {
    const discount = evaluatePromotion(promo, ctx);
    if (discount <= 0) continue;
    if (
      !best ||
      discount > best.discount ||
      (discount === best.discount && promo.priority > best.promo.priority)
    ) {
      best = { promo, discount };
    }
  }
  return best;
}
