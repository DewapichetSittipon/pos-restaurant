import { Module } from '@nestjs/common';
import { ShopRequestsController } from './shop-requests.controller';
import { ShopRequestsService } from './shop-requests.service';

@Module({
  controllers: [ShopRequestsController],
  providers: [ShopRequestsService],
})
export class ShopRequestsModule {}
