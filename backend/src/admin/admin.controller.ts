import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateShopDto } from './dto/create-shop.dto';
import { ResetStaffPasswordDto } from './dto/reset-staff-password.dto';
import { SetShopPlanDto } from './dto/set-shop-plan.dto';
import { PlatformAdminGuard } from './platform-admin.guard';
import { ADMIN_TOKEN_COOKIE } from './admin.types';
import { CurrentAdmin } from './current-admin.decorator';
import type { PlatformAdminJwtPayload } from './admin.types';
import { CROSS_SITE_COOKIE } from '../common/cookie-options';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, admin } = await this.admin.login(dto.username, dto.password);
    res.cookie(ADMIN_TOKEN_COOKIE, token, {
      httpOnly: true,
      ...CROSS_SITE_COOKIE,
      maxAge: 1000 * 60 * 60 * 12,
    });
    return { admin };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ADMIN_TOKEN_COOKIE, CROSS_SITE_COOKIE);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(PlatformAdminGuard)
  me(@CurrentAdmin() admin: PlatformAdminJwtPayload) {
    return { admin: { id: admin.sub, username: admin.username } };
  }

  @Get('shops')
  @UseGuards(PlatformAdminGuard)
  listShops() {
    return this.admin.listShops();
  }

  // แพ็กเกจทั้งหมด (ให้เลือกตอนเปลี่ยน plan ของร้าน)
  @Get('plans')
  @UseGuards(PlatformAdminGuard)
  listPlans() {
    return this.admin.listPlans();
  }

  // เปลี่ยนแพ็กเกจ/รอบจ่ายของร้าน (manual)
  @Post('shops/:id/plan')
  @UseGuards(PlatformAdminGuard)
  setShopPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetShopPlanDto,
  ) {
    return this.admin.setShopPlan(id, dto);
  }

  @Post('shops')
  @UseGuards(PlatformAdminGuard)
  createShop(@Body() dto: CreateShopDto) {
    return this.admin.createShop(dto);
  }

  // อนุมัติร้านที่สมัครเอง (pending -> active)
  @Post('shops/:id/approve')
  @UseGuards(PlatformAdminGuard)
  approveShop(@Param('id', ParseIntPipe) id: number) {
    return this.admin.approveShop(id);
  }

  // พนักงานของร้าน (สำหรับ reset รหัส)
  @Get('shops/:id/staff')
  @UseGuards(PlatformAdminGuard)
  listShopStaff(@Param('id', ParseIntPipe) id: number) {
    return this.admin.listShopStaff(id);
  }

  // admin รีเซ็ตรหัสผ่านพนักงาน (กู้ร้านที่ลืมรหัส)
  @Post('staff/:staffId/reset-password')
  @UseGuards(PlatformAdminGuard)
  resetStaffPassword(
    @Param('staffId', ParseIntPipe) staffId: number,
    @Body() dto: ResetStaffPasswordDto,
  ) {
    return this.admin.resetStaffPassword(staffId, dto.password);
  }

  @Delete('shops/:id')
  @UseGuards(PlatformAdminGuard)
  deleteShop(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteShop(id);
  }
}
