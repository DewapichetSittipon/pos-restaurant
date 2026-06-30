import { describe, it, expect } from 'vitest';
import {
  PLAN_FEATURES,
  FREE_PLAN_FALLBACK,
  planHasFeature,
  limitForResource,
  canAddResource,
  type PlanAccess,
} from './plan-access';

const free: PlanAccess = FREE_PLAN_FALLBACK;
const pro: PlanAccess = {
  features: [PLAN_FEATURES.promotions, PLAN_FEATURES.loyalty, PLAN_FEATURES.i18n],
  maxStaff: null,
  maxTable: null,
  maxMenu: null,
};

describe('planHasFeature', () => {
  it('ฟรีไม่มีฟีเจอร์เสริมเลย', () => {
    expect(planHasFeature(free, PLAN_FEATURES.promotions)).toBe(false);
    expect(planHasFeature(free, PLAN_FEATURES.loyalty)).toBe(false);
  });

  it('โปรมีฟีเจอร์ที่ปลดล็อก', () => {
    expect(planHasFeature(pro, PLAN_FEATURES.promotions)).toBe(true);
    expect(planHasFeature(pro, PLAN_FEATURES.i18n)).toBe(true);
  });

  it('โปรไม่มีฟีเจอร์ที่ไม่อยู่ในรายการ (เช่น multi_branch)', () => {
    expect(planHasFeature(pro, PLAN_FEATURES.multiBranch)).toBe(false);
  });
});

describe('limitForResource', () => {
  it('คืนเพดานของฟรีตาม resource', () => {
    expect(limitForResource(free, 'staff')).toBe(3);
    expect(limitForResource(free, 'table')).toBe(10);
    expect(limitForResource(free, 'menu')).toBe(30);
  });

  it('null = ไม่จำกัด (โปร)', () => {
    expect(limitForResource(pro, 'staff')).toBeNull();
  });
});

describe('canAddResource', () => {
  it('เพิ่มได้เมื่อยังไม่ถึงเพดาน', () => {
    expect(canAddResource(free, 'staff', 2)).toBe(true);
  });

  it('เพิ่มไม่ได้เมื่อถึงเพดานพอดี (currentCount = limit)', () => {
    expect(canAddResource(free, 'staff', 3)).toBe(false);
  });

  it('เพิ่มไม่ได้เมื่อเกินเพดาน', () => {
    expect(canAddResource(free, 'menu', 31)).toBe(false);
  });

  it('limit null = เพิ่มได้เสมอ', () => {
    expect(canAddResource(pro, 'staff', 9999)).toBe(true);
  });
});
