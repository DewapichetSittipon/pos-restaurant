import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestWithStaff } from '../auth/auth.types';
import type { PlanFeature } from '../common/plan-access';
import { SubscriptionService } from './subscription.service';
import { REQUIRE_FEATURE_KEY } from './require-feature.decorator';

// บังคับว่า plan ของร้านต้องปลดล็อกฟีเจอร์ที่ route ระบุไว้ (@RequireFeature)
// ถ้าไม่มี metadata = ผ่าน; ถ้ามีแต่ plan ไม่ครอบคลุม = SubscriptionService โยน 402
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscription: SubscriptionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<PlanFeature | undefined>(
      REQUIRE_FEATURE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!feature) {
      return true;
    }
    const req = ctx.switchToHttp().getRequest<RequestWithStaff>();
    const shopId = req.staff?.shopId;
    if (typeof shopId !== 'number') {
      return true; // ไม่มี staff context (น่าจะลืม JwtAuthGuard) — ปล่อยให้ guard อื่นจัดการ
    }
    await this.subscription.assertFeature(shopId, feature);
    return true;
  }
}
