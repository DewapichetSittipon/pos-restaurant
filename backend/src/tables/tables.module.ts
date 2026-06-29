import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { SessionController } from './session.controller';

@Module({
  imports: [EventsModule, PromotionsModule],
  controllers: [TablesController, SessionController],
  providers: [TablesService],
})
export class TablesModule {}
