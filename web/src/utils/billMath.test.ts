import { describe, it, expect } from 'vitest';
import { computeBillTotals, type BillCharges } from './billMath';

// ⚠️ ชุดเคสนี้ต้องให้ผลตรงกับ backend (backend/src/common/bill-math.spec.ts)
// เพราะ billMath.ts ฝั่ง web เป็นสำเนาของ bill-math.ts ฝั่ง backend — ถ้าผลต่างแปลว่าสองไฟล์หลุด sync
// เงินเป็นหน่วยสตางค์, rate เป็น basis points (700 = 7%, 1000 = 10%)
const NO_CHARGES: BillCharges = {
  vatRate: 0,
  vatInclusive: true,
  serviceChargeRate: 0,
};

describe('computeBillTotals (web — ต้อง sync กับ backend)', () => {
  it('ไม่มีภาษี/เซอร์วิส/ส่วนลด', () => {
    expect(computeBillTotals(10000, 0, NO_CHARGES)).toEqual({
      subtotal: 10000,
      discount: 0,
      serviceCharge: 0,
      vatAmount: 0,
      total: 10000,
    });
  });

  it('เซอร์วิสชาร์จ 10%', () => {
    const r = computeBillTotals(10000, 0, { vatRate: 0, vatInclusive: true, serviceChargeRate: 1000 });
    expect(r.serviceCharge).toBe(1000);
    expect(r.total).toBe(11000);
  });

  it('VAT 7% exclusive', () => {
    const r = computeBillTotals(10000, 0, { vatRate: 700, vatInclusive: false, serviceChargeRate: 0 });
    expect(r.vatAmount).toBe(700);
    expect(r.total).toBe(10700);
  });

  it('VAT 7% inclusive (ยอดไม่เปลี่ยน)', () => {
    const r = computeBillTotals(10700, 0, { vatRate: 700, vatInclusive: true, serviceChargeRate: 0 });
    expect(r.vatAmount).toBe(700);
    expect(r.total).toBe(10700);
  });

  it('VAT inclusive ปัดเศษลง', () => {
    const r = computeBillTotals(10000, 0, { vatRate: 700, vatInclusive: true, serviceChargeRate: 0 });
    expect(r.vatAmount).toBe(654);
    expect(r.total).toBe(10000);
  });

  it('เซอร์วิส 10% + VAT 7% exclusive', () => {
    const r = computeBillTotals(10000, 0, { vatRate: 700, vatInclusive: false, serviceChargeRate: 1000 });
    expect(r.serviceCharge).toBe(1000);
    expect(r.vatAmount).toBe(770);
    expect(r.total).toBe(11770);
  });

  it('เซอร์วิส 10% + VAT 7% inclusive', () => {
    const r = computeBillTotals(10000, 0, { vatRate: 700, vatInclusive: true, serviceChargeRate: 1000 });
    expect(r.serviceCharge).toBe(1000);
    expect(r.vatAmount).toBe(720);
    expect(r.total).toBe(11000);
  });

  it('ส่วนลด + เซอร์วิส + VAT exclusive', () => {
    const r = computeBillTotals(10000, 2000, { vatRate: 700, vatInclusive: false, serviceChargeRate: 1000 });
    expect(r.discount).toBe(2000);
    expect(r.serviceCharge).toBe(800);
    expect(r.vatAmount).toBe(616);
    expect(r.total).toBe(9416);
  });

  it('ส่วนลดเกินยอด → clamp, total = 0', () => {
    const r = computeBillTotals(5000, 9999, NO_CHARGES);
    expect(r.discount).toBe(5000);
    expect(r.total).toBe(0);
  });

  it('ส่วนลดติดลบ → 0', () => {
    const r = computeBillTotals(5000, -100, NO_CHARGES);
    expect(r.discount).toBe(0);
    expect(r.total).toBe(5000);
  });

  it('อัตราติดลบ → 0', () => {
    const r = computeBillTotals(10000, 0, { vatRate: -700, vatInclusive: false, serviceChargeRate: -500 });
    expect(r.serviceCharge).toBe(0);
    expect(r.vatAmount).toBe(0);
    expect(r.total).toBe(10000);
  });

  it('ปัดเศษครึ่งสตางค์ขึ้น', () => {
    const r = computeBillTotals(15, 0, { vatRate: 0, vatInclusive: true, serviceChargeRate: 1000 });
    expect(r.serviceCharge).toBe(2);
    expect(r.total).toBe(17);
  });

  it('เคสจริงผสม inclusive', () => {
    const r = computeBillTotals(12345, 345, { vatRate: 700, vatInclusive: true, serviceChargeRate: 1000 });
    expect(r.serviceCharge).toBe(1200);
    expect(r.vatAmount).toBe(864);
    expect(r.total).toBe(13200);
  });

  it('subtotal = 0', () => {
    expect(computeBillTotals(0, 0, { vatRate: 700, vatInclusive: false, serviceChargeRate: 1000 })).toEqual({
      subtotal: 0,
      discount: 0,
      serviceCharge: 0,
      vatAmount: 0,
      total: 0,
    });
  });
});
