import { describe, it, expect } from 'vitest';
import {
  bangkokParts,
  evaluatePromotion,
  pickBestPromotion,
  type PromotionRule,
  type PromotionContext,
} from './promotion-math';

// โปรพื้นฐาน: ใช้ได้ทุกวันทั้งวัน ไม่จำกัดสมาชิก (override เฉพาะที่ทดสอบ)
const base: PromotionRule = {
  type: 'percent',
  value: 1000, // 10%
  minSubtotal: 0,
  maxDiscount: null,
  startMinute: null,
  endMinute: null,
  daysOfWeek: 127,
  buyQty: 0,
  getQty: 0,
  membersOnly: false,
  birthdayOnly: false,
  isActive: true,
};

// 2026-06-29 12:00 เวลาไทย = 2026-06-29T05:00:00Z (จันทร์)
const noonMon = new Date('2026-06-29T05:00:00Z');

const ctx = (over: Partial<PromotionContext> = {}): PromotionContext => ({
  subtotal: 100000, // 1,000 บาท
  unitPrices: [],
  hasMember: false,
  isMemberBirthday: false,
  now: noonMon,
  ...over,
});

describe('bangkokParts', () => {
  it('แปลง UTC → เวลาไทย (UTC+7) ถูกต้อง', () => {
    const p = bangkokParts(noonMon);
    expect(p).toEqual({ dayOfWeek: 1, minuteOfDay: 12 * 60, month: 6, day: 29 });
  });

  it('ข้ามวันเมื่อ +7 ชั่วโมงเลยเที่ยงคืน', () => {
    // 2026-06-29T18:00:00Z = 2026-06-30 01:00 เวลาไทย (อังคาร)
    const p = bangkokParts(new Date('2026-06-29T18:00:00Z'));
    expect(p.day).toBe(30);
    expect(p.dayOfWeek).toBe(2);
    expect(p.minuteOfDay).toBe(60);
  });
});

describe('evaluatePromotion — ส่วนลด %/บาท', () => {
  it('percent 10% ของ 1,000 บาท = 100 บาท', () => {
    expect(evaluatePromotion(base, ctx())).toBe(10000);
  });

  it('percent เคารพเพดาน maxDiscount', () => {
    expect(
      evaluatePromotion({ ...base, value: 5000, maxDiscount: 8000 }, ctx()),
    ).toBe(8000); // 50% = 500 บาท แต่เพดาน 80 บาท
  });

  it('amount ลดคงที่ ไม่เกินยอดรวม', () => {
    expect(
      evaluatePromotion({ ...base, type: 'amount', value: 5000 }, ctx()),
    ).toBe(5000);
    expect(
      evaluatePromotion(
        { ...base, type: 'amount', value: 999999 },
        ctx({ subtotal: 30000 }),
      ),
    ).toBe(30000);
  });
});

describe('evaluatePromotion — เงื่อนไข', () => {
  it('ยอดไม่ถึงขั้นต่ำ → 0', () => {
    expect(
      evaluatePromotion({ ...base, minSubtotal: 200000 }, ctx()),
    ).toBe(0);
  });

  it('isActive=false → 0', () => {
    expect(evaluatePromotion({ ...base, isActive: false }, ctx())).toBe(0);
  });

  it('membersOnly ต้องมีสมาชิก', () => {
    const p = { ...base, membersOnly: true };
    expect(evaluatePromotion(p, ctx({ hasMember: false }))).toBe(0);
    expect(evaluatePromotion(p, ctx({ hasMember: true }))).toBe(10000);
  });

  it('birthdayOnly ต้องตรงวันเกิด', () => {
    const p = { ...base, birthdayOnly: true };
    expect(
      evaluatePromotion(p, ctx({ hasMember: true, isMemberBirthday: false })),
    ).toBe(0);
    expect(
      evaluatePromotion(p, ctx({ hasMember: true, isMemberBirthday: true })),
    ).toBe(10000);
  });
});

describe('evaluatePromotion — ช่วงเวลา/วัน', () => {
  it('happy hour ในช่วง (11:00–14:00) ใช้ได้', () => {
    expect(
      evaluatePromotion({ ...base, startMinute: 660, endMinute: 840 }, ctx()),
    ).toBe(10000);
  });

  it('นอกช่วง happy hour → 0', () => {
    expect(
      evaluatePromotion({ ...base, startMinute: 840, endMinute: 1080 }, ctx()),
    ).toBe(0); // 14:00–18:00 แต่ตอนนี้เที่ยง
  });

  it('ช่วงข้ามเที่ยงคืน (22:00–02:00)', () => {
    const p = { ...base, startMinute: 1320, endMinute: 120 };
    // 23:00 เวลาไทย = 16:00Z
    expect(evaluatePromotion(p, ctx({ now: new Date('2026-06-29T16:00:00Z') }))).toBe(
      10000,
    );
    // เที่ยง = นอกช่วง
    expect(evaluatePromotion(p, ctx())).toBe(0);
  });

  it('วันจันทร์ไม่อยู่ใน bitmask → 0', () => {
    // เฉพาะเสาร์(64)+อาทิตย์(1) = 65; จันทร์ (bit1) ไม่อยู่
    expect(evaluatePromotion({ ...base, daysOfWeek: 65 }, ctx())).toBe(0);
  });
});

describe('evaluatePromotion — BOGO', () => {
  it('ซื้อ 1 แถม 1: 4 ชิ้น → ฟรี 2 ชิ้นถูกสุด', () => {
    const p = { ...base, type: 'bogo' as const, buyQty: 1, getQty: 1 };
    // ราคา 100,80,60,40 บาท → 2 รอบ, ฟรี 40+60 = 100 บาท
    const r = evaluatePromotion(
      p,
      ctx({ unitPrices: [10000, 8000, 6000, 4000] }),
    );
    expect(r).toBe(10000);
  });

  it('ยังไม่ครบรอบ → 0', () => {
    const p = { ...base, type: 'bogo' as const, buyQty: 2, getQty: 1 };
    expect(evaluatePromotion(p, ctx({ unitPrices: [10000, 8000] }))).toBe(0);
  });
});

describe('pickBestPromotion', () => {
  it('เลือกส่วนลดมากสุด', () => {
    const a = { ...base, value: 1000, priority: 0 }; // 10% = 100
    const b = { ...base, type: 'amount' as const, value: 15000, priority: 0 }; // 150
    const best = pickBestPromotion([a, b], ctx());
    expect(best?.discount).toBe(15000);
    expect(best?.promo).toBe(b);
  });

  it('เสมอกันเลือก priority สูงกว่า', () => {
    const a = { ...base, priority: 1 };
    const b = { ...base, priority: 5 };
    expect(pickBestPromotion([a, b], ctx())?.promo).toBe(b);
  });

  it('ไม่มีโปรเข้าเงื่อนไข → null', () => {
    expect(
      pickBestPromotion([{ ...base, minSubtotal: 999999, priority: 0 }], ctx()),
    ).toBeNull();
  });
});
