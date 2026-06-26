import { Body, Controller, Post } from '@nestjs/common';
import { ShopRequestsService } from './shop-requests.service';
import { CreateShopRequestDto } from './dto/create-shop-request.dto';

@Controller('shop-requests')
export class ShopRequestsController {
  constructor(private readonly service: ShopRequestsService) {}

  // public — ร้านค้าส่งคำขอเปิดร้าน (ไม่ต้อง login)
  @Post()
  submit(@Body() dto: CreateShopRequestDto) {
    return this.service.submit(dto);
  }
}
