import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentShop } from '../auth/current-shop.decorator';

// endpoints ฝั่งพนักงาน (ต้องล็อกอิน) — scope ด้วยร้านของ staff
@Controller('tables')
@UseGuards(JwtAuthGuard)
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Get()
  list(@CurrentShop() shopId: number) {
    return this.tables.listTables(shopId);
  }

  @Post()
  create(@CurrentShop() shopId: number, @Body() dto: CreateTableDto) {
    return this.tables.createTable(shopId, dto.tableNumber);
  }

  @Delete(':id')
  remove(@CurrentShop() shopId: number, @Param('id', ParseIntPipe) id: number) {
    return this.tables.deleteTable(shopId, id);
  }

  @Post(':id/open')
  open(@CurrentShop() shopId: number, @Param('id', ParseIntPipe) id: number) {
    return this.tables.openTable(shopId, id);
  }

  @Post(':id/checkout')
  checkout(@CurrentShop() shopId: number, @Param('id', ParseIntPipe) id: number) {
    return this.tables.checkout(shopId, id);
  }
}
