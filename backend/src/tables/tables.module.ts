import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { TablesService } from './tables.service';
import { TablesController } from './tables.controller';
import { SessionController } from './session.controller';

@Module({
  imports: [EventsModule],
  controllers: [TablesController, SessionController],
  providers: [TablesService],
})
export class TablesModule {}
