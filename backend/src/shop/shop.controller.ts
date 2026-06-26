import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ShopService } from './shop.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';

// ข้อมูลร้านของ staff ที่ล็อกอิน (หัวใบเสร็จ) — scope ด้วยร้านเสมอ
// WAITER อ่านได้ (ไว้พิมพ์หัวใบเสร็จตอนเช็คบิล) แต่แก้ตั้งค่าร้านเป็นของ OWNER
@Controller('shop')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Get()
  @Roles('OWNER', 'WAITER')
  get(@CurrentShop() shopId: number) {
    return this.shop.get(shopId);
  }

  @Patch()
  @Roles('OWNER')
  update(@CurrentShop() shopId: number, @Body() dto: UpdateShopDto) {
    return this.shop.update(shopId, dto);
  }
}
