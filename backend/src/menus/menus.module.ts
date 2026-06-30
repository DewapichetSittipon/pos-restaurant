import { Module } from '@nestjs/common';
import { MenusService } from './menus.service';
import { MenusController, CustomerMenusController } from './menus.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [MenusController, CustomerMenusController],
  providers: [MenusService],
})
export class MenusModule {}
