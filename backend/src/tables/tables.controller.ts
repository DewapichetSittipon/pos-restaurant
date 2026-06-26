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
import { CheckoutDto } from './dto/checkout.dto';
import { TransferBillDto } from './dto/transfer-bill.dto';
import { MergeBillDto } from './dto/merge-bill.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';

// endpoints ฝั่งพนักงาน (ต้องล็อกอิน + ร้าน active) — scope ด้วยร้านของ staff
// OWNER ทำได้ทุกอย่าง, WAITER ทำงานหน้าโต๊ะได้ แต่สร้าง/ลบโต๊ะเป็นของ OWNER
@Controller('tables')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Get()
  @Roles('OWNER', 'WAITER')
  list(@CurrentShop() shopId: number) {
    return this.tables.listTables(shopId);
  }

  @Post()
  @Roles('OWNER')
  create(@CurrentShop() shopId: number, @Body() dto: CreateTableDto) {
    return this.tables.createTable(shopId, dto.tableNumber);
  }

  @Delete(':id')
  @Roles('OWNER')
  remove(@CurrentShop() shopId: number, @Param('id', ParseIntPipe) id: number) {
    return this.tables.deleteTable(shopId, id);
  }

  // รายการของบิลที่เปิดอยู่ของโต๊ะ (ให้พนักงานดูว่าโต๊ะนี้สั่งอะไรไปแล้ว)
  @Get(':id/bill')
  @Roles('OWNER', 'WAITER')
  currentBill(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tables.getCurrentBill(shopId, id);
  }

  @Post(':id/open')
  @Roles('OWNER', 'WAITER')
  open(@CurrentShop() shopId: number, @Param('id', ParseIntPipe) id: number) {
    return this.tables.openTable(shopId, id);
  }

  // ย้ายบิลที่เปิดอยู่จากโต๊ะนี้ไปโต๊ะปลายทาง
  @Post(':id/transfer')
  @Roles('OWNER', 'WAITER')
  transfer(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferBillDto,
  ) {
    return this.tables.transferBill(shopId, id, dto.toTableId);
  }

  // รวมบิลโต๊ะต้นทาง (body.fromTableId) เข้ากับโต๊ะนี้ (:id = ปลายทาง)
  @Post(':id/merge')
  @Roles('OWNER', 'WAITER')
  merge(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MergeBillDto,
  ) {
    return this.tables.mergeBills(shopId, id, dto.fromTableId);
  }

  @Post(':id/checkout')
  @Roles('OWNER', 'WAITER')
  checkout(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckoutDto,
  ) {
    return this.tables.checkout(shopId, id, dto);
  }
}
