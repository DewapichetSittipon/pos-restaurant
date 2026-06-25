import { Module } from '@nestjs/common';
import { MenusService } from './menus.service';
import { MenusController, CustomerMenusController } from './menus.controller';

@Module({
  controllers: [MenusController, CustomerMenusController],
  providers: [MenusService],
})
export class MenusModule {}
