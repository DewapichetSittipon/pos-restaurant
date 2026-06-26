import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto, SetPasswordDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { CurrentShop } from '../auth/current-shop.decorator';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { JwtPayload } from '../auth/auth.types';

// จัดการพนักงานในร้านตัวเอง — scope ด้วย shopId ของ staff ที่ล็อกอิน
@Controller('staff')
@UseGuards(JwtAuthGuard, ActiveShopGuard)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list(@CurrentShop() shopId: number) {
    return this.staff.listStaff(shopId);
  }

  @Post()
  create(@CurrentShop() shopId: number, @Body() dto: CreateStaffDto) {
    return this.staff.createStaff(shopId, dto.username, dto.password);
  }

  @Patch(':id/password')
  setPassword(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetPasswordDto,
  ) {
    return this.staff.setPassword(shopId, id, dto.password);
  }

  @Delete(':id')
  remove(
    @CurrentShop() shopId: number,
    @CurrentStaff() current: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.staff.deleteStaff(shopId, id, current.sub);
  }
}
