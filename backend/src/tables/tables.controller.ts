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
import { SplitBillDto } from './dto/split-bill.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';

// endpoints ฝั่งพนักงาน (ต้องล็อกอิน + ร้าน active) — scope ด้วยร้านของ staff
// OWNER ทำได้ทุกอย่าง, WAITER ทำงานหน้าโต๊ะได้ แต่สร้าง/ลบโต๊ะเป็นของ OWNER
@Controller('tables')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
export class TablesController {
  constructor(
    private readonly tables: TablesService,
    private readonly audit: AuditService,
  ) {}

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
  async transfer(
    @CurrentShop() shopId: number,
    @CurrentStaff() staff: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferBillDto,
  ) {
    const result = await this.tables.transferBill(shopId, id, dto.toTableId);
    await this.audit.log(
      shopId,
      { id: staff.sub, username: staff.username },
      'bill.transfer',
      `ย้ายบิลโต๊ะ #${id} → โต๊ะ #${dto.toTableId}`,
    );
    return result;
  }

  // รวมบิลโต๊ะต้นทาง (body.fromTableId) เข้ากับโต๊ะนี้ (:id = ปลายทาง)
  @Post(':id/merge')
  @Roles('OWNER', 'WAITER')
  async merge(
    @CurrentShop() shopId: number,
    @CurrentStaff() staff: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MergeBillDto,
  ) {
    const result = await this.tables.mergeBills(shopId, id, dto.fromTableId);
    await this.audit.log(
      shopId,
      { id: staff.sub, username: staff.username },
      'bill.merge',
      `รวมบิลโต๊ะ #${dto.fromTableId} → โต๊ะ #${id}`,
    );
    return result;
  }

  // แยกบิล: ย้ายรายการที่เลือกจากโต๊ะนี้ (:id) ไปเปิดบิลใหม่ที่โต๊ะว่าง (body.toTableId)
  @Post(':id/split')
  @Roles('OWNER', 'WAITER')
  async split(
    @CurrentShop() shopId: number,
    @CurrentStaff() staff: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SplitBillDto,
  ) {
    const result = await this.tables.splitBill(
      shopId,
      id,
      dto.toTableId,
      dto.orderItemIds,
    );
    await this.audit.log(
      shopId,
      { id: staff.sub, username: staff.username },
      'bill.split',
      `แยก ${dto.orderItemIds.length} รายการ จากโต๊ะ #${id} → โต๊ะ #${dto.toTableId}`,
    );
    return result;
  }

  @Post(':id/checkout')
  @Roles('OWNER', 'WAITER')
  async checkout(
    @CurrentShop() shopId: number,
    @CurrentStaff() staff: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckoutDto,
  ) {
    const result = await this.tables.checkout(shopId, id, dto);
    const discountNote =
      result.discount > 0 ? ` · ลด ${result.discount / 100} บาท` : '';
    await this.audit.log(
      shopId,
      { id: staff.sub, username: staff.username },
      'bill.checkout',
      `บิล #${result.id} · ${(result.totalPrice ?? 0) / 100} บาท${discountNote}`,
    );
    return result;
  }
}
