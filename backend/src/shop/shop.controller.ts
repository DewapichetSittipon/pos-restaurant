import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { RequestPlanDto } from './dto/request-plan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';
import { SubscriptionService } from '../subscription/subscription.service';

// ข้อมูลร้านของ staff ที่ล็อกอิน (หัวใบเสร็จ) — scope ด้วยร้านเสมอ
// WAITER อ่านได้ (ไว้พิมพ์หัวใบเสร็จตอนเช็คบิล) แต่แก้ตั้งค่าร้านเป็นของ OWNER
@Controller('shop')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
export class ShopController {
  constructor(
    private readonly shop: ShopService,
    private readonly subscription: SubscriptionService,
  ) {}

  @Get()
  @Roles('OWNER', 'WAITER')
  get(@CurrentShop() shopId: number) {
    return this.shop.get(shopId);
  }

  // แพ็กเกจ + โควต้าที่ใช้ไปของร้าน — ฝั่ง web ใช้ซ่อน/ล็อกฟีเจอร์
  @Get('subscription')
  @Roles('OWNER', 'WAITER')
  subscriptionSummary(@CurrentShop() shopId: number) {
    return this.subscription.getSummary(shopId);
  }

  // ร้านกดขออัปเกรดแพ็กเกจ (รออนุมัติจาก admin — จ่ายเงิน manual) — เจ้าของร้านเท่านั้น
  @Post('subscription/request')
  @Roles('OWNER')
  requestPlan(@CurrentShop() shopId: number, @Body() dto: RequestPlanDto) {
    return this.subscription.requestPlan(shopId, dto.planKey);
  }

  // ยกเลิกคำขออัปเกรดที่ยังรออนุมัติ
  @Delete('subscription/request')
  @Roles('OWNER')
  cancelPlanRequest(@CurrentShop() shopId: number) {
    return this.subscription.cancelPlanRequest(shopId);
  }

  @Patch()
  @Roles('OWNER')
  update(@CurrentShop() shopId: number, @Body() dto: UpdateShopDto) {
    return this.shop.update(shopId, dto);
  }
}
