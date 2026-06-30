import { SetMetadata } from '@nestjs/common';
import type { PlanFeature } from '../common/plan-access';

// ทำเครื่องหมายว่า route/controller นี้ต้องมีฟีเจอร์ตาม subscription plan
// ใช้คู่กับ FeatureGuard (ต้องวางต่อจาก JwtAuthGuard เพื่อให้มี req.staff.shopId)
export const REQUIRE_FEATURE_KEY = 'require_feature';
export const RequireFeature = (feature: PlanFeature) =>
  SetMetadata(REQUIRE_FEATURE_KEY, feature);
