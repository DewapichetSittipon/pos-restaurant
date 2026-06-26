import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';

// สมาชิก/แต้มสะสม — OWNER จัดการ, WAITER ค้นหา/เพิ่มตอนเช็คบิล
@Controller('members')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
@Roles('OWNER', 'WAITER')
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
    return this.members.create(shopId, dto.phone, dto.name);
  }
}
