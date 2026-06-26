import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ShopService } from './shop.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { CurrentShop } from '../auth/current-shop.decorator';

// ข้อมูลร้านของ staff ที่ล็อกอิน (หัวใบเสร็จ) — scope ด้วยร้านเสมอ
@Controller('shop')
@UseGuards(JwtAuthGuard, ActiveShopGuard)
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Get()
  get(@CurrentShop() shopId: number) {
    return this.shop.get(shopId);
  }

  @Patch()
  update(@CurrentShop() shopId: number, @Body() dto: UpdateShopDto) {
    return this.shop.update(shopId, dto);
  }
}
