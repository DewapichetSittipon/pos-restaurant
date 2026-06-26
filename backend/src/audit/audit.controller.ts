import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';

// ประวัติการกระทำของพนักงาน — เฉพาะเจ้าของร้าน
@Controller('audit')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
@Roles('OWNER')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@CurrentShop() shopId: number, @Query('limit') limit?: string) {
    return this.audit.list(shopId, limit ? Number(limit) : undefined);
  }
}
