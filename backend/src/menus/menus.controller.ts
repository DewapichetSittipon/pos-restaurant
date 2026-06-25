import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Bill, Table } from '@prisma/client';
import { MenusService } from './menus.service';
import { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentShop } from '../auth/current-shop.decorator';
import { CustomerTokenGuard } from '../auth/customer-token.guard';
import { CurrentBill } from '../auth/current-bill.decorator';
import {
  MAX_IMAGE_BYTES,
  type UploadedImageFile,
} from '../uploads/uploads.constants';

// ฝั่งพนักงาน: ดู + จัดการเมนูของร้านตัวเอง (JWT)
@Controller('menus')
@UseGuards(JwtAuthGuard)
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  @Get()
  catalog(@CurrentShop() shopId: number) {
    return this.menus.catalog(shopId);
  }

  @Post()
  create(@CurrentShop() shopId: number, @Body() dto: CreateMenuDto) {
    return this.menus.create(shopId, dto);
  }

  @Patch(':id')
  update(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.menus.update(shopId, id, dto);
  }

  @Delete(':id')
  archive(@CurrentShop() shopId: number, @Param('id', ParseIntPipe) id: number) {
    return this.menus.archive(shopId, id);
  }

  // อัปโหลดรูปเมนู (multipart field ชื่อ "image")
  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }),
  )
  uploadImage(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: UploadedImageFile,
  ) {
    return this.menus.setImage(shopId, id, file);
  }

  @Delete(':id/image')
  clearImage(@CurrentShop() shopId: number, @Param('id', ParseIntPipe) id: number) {
    return this.menus.clearImage(shopId, id);
  }
}

// ฝั่งลูกค้า: เมนูของร้านที่ผูกกับ qr_token (resolve shop จาก bill)
@Controller('customer')
@UseGuards(CustomerTokenGuard)
export class CustomerMenusController {
  constructor(private readonly menus: MenusService) {}

  @Get('menus')
  catalog(@CurrentBill() bill: Bill & { table: Table }) {
    return this.menus.catalog(bill.shopId);
  }
}
