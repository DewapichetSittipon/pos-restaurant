import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { RefundBillDto } from './dto/refund-bill.dto';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { FeatureGuard } from '../subscription/feature.guard';
import { RequireFeature } from '../subscription/require-feature.decorator';
import { PLAN_FEATURES } from '../common/plan-access';

// ยอดขาย/รายงาน — เฉพาะเจ้าของร้าน
@Controller('reports')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard, FeatureGuard)
@Roles('OWNER')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly audit: AuditService,
  ) {}

  // GET /api/reports/eod?date=YYYY-MM-DD (ไม่ใส่ = วันนี้ตามเวลาไทย) — scope ตามร้าน
  @Get('eod')
  eod(@CurrentShop() shopId: number, @Query('date') date?: string) {
    return this.reports.eod(shopId, date);
  }

  // GET /api/reports/top-menus?date=YYYY-MM-DD — เมนูขายดีของวัน
  @Get('top-menus')
  topMenus(@CurrentShop() shopId: number, @Query('date') date?: string) {
    return this.reports.topMenus(shopId, date);
  }

  // GET /api/reports/hourly?date=YYYY-MM-DD — ยอดขายรายชั่วโมง
  @Get('hourly')
  @RequireFeature(PLAN_FEATURES.reportHistory)
  hourly(@CurrentShop() shopId: number, @Query('date') date?: string) {
    return this.reports.hourly(shopId, date);
  }

  // GET /api/reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD — ยอดขายรายวันในช่วง
  @Get('range')
  @RequireFeature(PLAN_FEATURES.reportHistory)
  range(
    @CurrentShop() shopId: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reports.range(shopId, from, to);
  }

  // GET /api/reports/export?from=...&to=... — ดาวน์โหลด CSV บิลในช่วง
  @Get('export')
  @RequireFeature(PLAN_FEATURES.reportHistory)
  async export(
    @CurrentShop() shopId: number,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const { filename, csv } = await this.reports.exportCsv(shopId, from, to);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(csv);
  }

  // GET /api/reports/prep-times?date=YYYY-MM-DD — เวลาเตรียมอาหารเฉลี่ยต่อเมนู
  @Get('prep-times')
  prepTimes(@CurrentShop() shopId: number, @Query('date') date?: string) {
    return this.reports.prepTimes(shopId, date);
  }

  // GET /api/reports/bills/:id — รายการเมนูของบิลย้อนหลัง จัดกลุ่มตามหมวด
  @Get('bills/:id')
  billDetail(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reports.billDetail(shopId, id);
  }

  // GET /api/reports/bills/:id/receipt — ข้อมูลสำหรับพิมพ์ใบเสร็จซ้ำ
  @Get('bills/:id/receipt')
  billReceipt(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reports.billReceipt(shopId, id);
  }

  // POST /api/reports/bills/:id/refund — คืนเงินบิลที่ชำระแล้ว
  @Post('bills/:id/refund')
  async refund(
    @CurrentShop() shopId: number,
    @CurrentStaff() staff: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefundBillDto,
  ) {
    const bill = await this.reports.refundBill(
      shopId,
      id,
      staff.username,
      dto.reason,
      dto.restoreStock ?? false,
    );
    await this.audit.log(
      shopId,
      { id: staff.sub, username: staff.username },
      'bill.refund',
      `บิล #${id} · ${(bill.totalPrice ?? 0) / 100} บาท · ${dto.reason}`,
    );
    return bill;
  }
}
