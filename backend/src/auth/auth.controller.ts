import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ACCESS_TOKEN_COOKIE, JwtAuthGuard } from './jwt-auth.guard';
import { CurrentStaff } from './current-staff.decorator';
import type { JwtPayload } from './auth.types';
import { CROSS_SITE_COOKIE } from '../common/cookie-options';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, staff } = await this.auth.login(dto.username, dto.password);
    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      ...CROSS_SITE_COOKIE,
      maxAge: 1000 * 60 * 60 * 12,
    });
    return { staff };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, CROSS_SITE_COOKIE);
    return { ok: true };
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentStaff() staff: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.auth.changePassword(
      staff.sub,
      dto.currentPassword,
      dto.newPassword,
    );
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentStaff() staff: JwtPayload) {
    return {
      staff: {
        id: staff.sub,
        username: staff.username,
        shopId: staff.shopId,
        shopStatus: staff.shopStatus,
      },
    };
  }
}
