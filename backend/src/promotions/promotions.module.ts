import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService], // TablesModule ใช้ตอน checkout
})
export class PromotionsModule {}
