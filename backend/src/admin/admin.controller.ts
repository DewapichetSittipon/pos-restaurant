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
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateShopDto } from './dto/create-shop.dto';
import { PlatformAdminGuard } from './platform-admin.guard';
import { ADMIN_TOKEN_COOKIE } from './admin.types';
import { CurrentAdmin } from './current-admin.decorator';
import type { PlatformAdminJwtPayload } from './admin.types';
import { CROSS_SITE_COOKIE } from '../common/cookie-options';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('login')
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

  @Delete('shops/:id')
  @UseGuards(PlatformAdminGuard)
  deleteShop(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteShop(id);
  }
}
