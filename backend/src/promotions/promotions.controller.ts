import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';

// โปรโมชัน — OWNER ตั้ง/แก้/ลบ; OWNER+WAITER ดูโปรที่ใช้ได้ตอนเช็คบิล
@Controller('promotions')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  @Roles('OWNER')
  list(@CurrentShop() shopId: number) {
    return this.promotions.list(shopId);
  }

  // โปรที่ใช้ได้กับบิลตอนนี้ (+ สมาชิกที่เลือก) พร้อมส่วนลดที่คำนวณแล้ว
  @Get('applicable')
  @Roles('OWNER', 'WAITER')
  applicable(
    @CurrentShop() shopId: number,
    @Query('billId', ParseIntPipe) billId: number,
    @Query('memberId') memberId?: string,
  ) {
    const mid = memberId ? Number(memberId) : undefined;
    return this.promotions.applicable(
      shopId,
      billId,
      Number.isFinite(mid) ? mid : undefined,
    );
  }

  @Post()
  @Roles('OWNER')
  create(@CurrentShop() shopId: number, @Body() dto: CreatePromotionDto) {
    return this.promotions.create(shopId, dto);
  }

  @Patch(':id')
  @Roles('OWNER')
  update(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotions.update(shopId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  remove(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.promotions.remove(shopId, id);
  }
}
