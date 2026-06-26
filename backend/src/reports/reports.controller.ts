import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';

// ยอดขาย/รายงาน — เฉพาะเจ้าของร้าน
@Controller('reports')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
@Roles('OWNER')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

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
}
