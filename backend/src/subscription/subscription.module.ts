import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { FeatureGuard } from './feature.guard';

// ให้บริการตรวจสิทธิ์ตาม subscription plan แก่ module อื่น
// SubscriptionService = assert ใน service; FeatureGuard = gate ที่ระดับ route ด้วย @RequireFeature
@Module({
  providers: [SubscriptionService, FeatureGuard],
  exports: [SubscriptionService, FeatureGuard],
})
export class SubscriptionModule {}
