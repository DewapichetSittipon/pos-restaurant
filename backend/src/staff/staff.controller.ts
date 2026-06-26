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
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { JwtPayload } from '../auth/auth.types';

// จัดการพนักงานในร้านตัวเอง — เฉพาะเจ้าของร้าน (OWNER) เท่านั้น
@Controller('staff')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
@Roles('OWNER')
export class StaffController {
  constructor(
    private readonly staff: StaffService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@CurrentShop() shopId: number) {
    return this.staff.listStaff(shopId);
  }

  @Post()
  async create(
    @CurrentShop() shopId: number,
    @CurrentStaff() current: JwtPayload,
    @Body() dto: CreateStaffDto,
  ) {
    const created = await this.staff.createStaff(
      shopId,
      dto.username,
      dto.password,
      dto.role,
    );
    await this.audit.log(
      shopId,
      { id: current.sub, username: current.username },
      'staff.create',
      `เพิ่มพนักงาน ${dto.username} (${dto.role})`,
    );
    return created;
  }

  @Patch(':id/password')
  async setPassword(
    @CurrentShop() shopId: number,
    @CurrentStaff() current: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetPasswordDto,
  ) {
    const result = await this.staff.setPassword(shopId, id, dto.password);
    await this.audit.log(
      shopId,
      { id: current.sub, username: current.username },
      'staff.password',
      `รีเซ็ตรหัสผ่านพนักงาน #${id}`,
    );
    return result;
  }

  @Delete(':id')
  async remove(
    @CurrentShop() shopId: number,
    @CurrentStaff() current: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.staff.deleteStaff(shopId, id, current.sub);
    await this.audit.log(
      shopId,
      { id: current.sub, username: current.username },
      'staff.delete',
      `ลบพนักงาน #${id}`,
    );
    return result;
  }
}
