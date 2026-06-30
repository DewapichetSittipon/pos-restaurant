import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';
import { FeatureGuard } from '../subscription/feature.guard';
import { RequireFeature } from '../subscription/require-feature.decorator';
import { PLAN_FEATURES } from '../common/plan-access';

// สมาชิก/แต้มสะสม — OWNER จัดการ, WAITER ค้นหา/เพิ่มตอนเช็คบิล (ฟีเจอร์แพ็กเกจโปร)
@Controller('members')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard, FeatureGuard)
@Roles('OWNER', 'WAITER')
@RequireFeature(PLAN_FEATURES.loyalty)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  // GET /members           → รายการสมาชิก
  // GET /members?phone=xxx → ค้นหาด้วยเบอร์ (404 ถ้าไม่พบ)
  @Get()
  async list(@CurrentShop() shopId: number, @Query('phone') phone?: string) {
    if (phone) {
      const member = await this.members.findByPhone(shopId, phone);
      if (!member) throw new NotFoundException('ไม่พบสมาชิก');
      return member;
    }
    return this.members.list(shopId);
  }

  @Post()
  create(@CurrentShop() shopId: number, @Body() dto: CreateMemberDto) {
    return this.members.create(shopId, dto.phone, dto.name, dto.birthDate);
  }

  @Patch(':id')
  update(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.members.update(shopId, id, dto);
  }
}
