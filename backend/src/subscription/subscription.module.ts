import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

// ให้บริการตรวจสิทธิ์ตาม subscription plan แก่ module อื่น (staff/tables/menus/promotions/reservations)
@Module({
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
