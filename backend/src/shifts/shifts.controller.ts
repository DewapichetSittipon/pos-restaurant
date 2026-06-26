import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { JwtPayload } from '../auth/auth.types';

// กะ/เงินลิ้นชัก — OWNER กับ WAITER (คนที่ดูแลเงินสด) เปิด/ปิด/ดูได้; KITCHEN ไม่เกี่ยว
@Controller('shifts')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
@Roles('OWNER', 'WAITER')
export class ShiftsController {
  constructor(
    private readonly shifts: ShiftsService,
    private readonly audit: AuditService,
  ) {}

  @Get('current')
  current(@CurrentShop() shopId: number) {
    return this.shifts.current(shopId);
  }

  @Get()
  list(@CurrentShop() shopId: number) {
    return this.shifts.list(shopId);
  }

  @Post('open')
  async open(
    @CurrentShop() shopId: number,
    @CurrentStaff() staff: JwtPayload,
    @Body() dto: OpenShiftDto,
  ) {
    const actor = { id: staff.sub, username: staff.username };
    const shift = await this.shifts.open(shopId, actor, dto.openingCash);
    await this.audit.log(
      shopId,
      actor,
      'shift.open',
      `เงินตั้งต้น ${dto.openingCash / 100} บาท`,
    );
    return shift;
  }

  @Post('close')
  async close(
    @CurrentShop() shopId: number,
    @CurrentStaff() staff: JwtPayload,
    @Body() dto: CloseShiftDto,
  ) {
    const actor = { id: staff.sub, username: staff.username };
    const shift = await this.shifts.close(
      shopId,
      actor,
      dto.closingCashCounted,
      dto.note,
    );
    await this.audit.log(
      shopId,
      actor,
      'shift.close',
      `นับได้ ${dto.closingCashCounted / 100} บาท · ส่วนต่าง ${
        (shift.summary.diffSatang ?? 0) / 100
      } บาท`,
    );
    return shift;
  }
}
