import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentShop } from '../auth/current-shop.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // GET /api/reports/eod?date=YYYY-MM-DD (ไม่ใส่ = วันนี้ตามเวลาไทย) — scope ตามร้าน
  @Get('eod')
  eod(@CurrentShop() shopId: number, @Query('date') date?: string) {
    return this.reports.eod(shopId, date);
  }
}
