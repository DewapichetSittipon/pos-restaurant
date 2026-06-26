import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Bill, Table } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { StaffOrderDto } from './dto/staff-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { VoidOrderDto } from './dto/void-order.dto';
import { CustomerTokenGuard } from '../auth/customer-token.guard';
import { CurrentBill } from '../auth/current-bill.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly audit: AuditService,
  ) {}

  // ลูกค้าสั่งอาหาร (ใช้ qr_token) — shop มาจาก bill
  @Post()
  @UseGuards(CustomerTokenGuard)
  create(
    @CurrentBill() bill: Bill & { table: Table },
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.create(bill.shopId, bill.id, dto.items);
  }

  // พนักงานคีย์ออเดอร์ให้โต๊ะ (resolve บิลที่เปิดอยู่จาก tableId)
  @Post('staff')
  @UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
  @Roles('OWNER', 'WAITER')
  createByStaff(@CurrentShop() shopId: number, @Body() dto: StaffOrderDto) {
    return this.orders.createByStaff(shopId, dto.tableId, dto.items);
  }

  // คิวครัว (queued + cooking ของร้านนี้)
  @Get('active')
  @UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
  @Roles('OWNER', 'KITCHEN')
  active(@CurrentShop() shopId: number) {
    return this.orders.activeQueue(shopId);
  }

  // staff เปลี่ยนสถานะอาหาร (ครัว)
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
  @Roles('OWNER', 'KITCHEN')
  updateStatus(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.orders.updateStatus(shopId, id, dto.status);
  }

  // ยกเลิก (void) รายการอาหาร พร้อมเหตุผล (หน้าโต๊ะ)
  @Post(':id/void')
  @UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
  @Roles('OWNER', 'WAITER')
  async voidItem(
    @CurrentShop() shopId: number,
    @CurrentStaff() staff: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VoidOrderDto,
  ) {
    const item = await this.orders.voidItem(shopId, id, dto.reason);
    await this.audit.log(
      shopId,
      { id: staff.sub, username: staff.username },
      'order.void',
      `ยกเลิก ${item.itemName} ×${item.quantity} · ${dto.reason}`,
    );
    return item;
  }
}
