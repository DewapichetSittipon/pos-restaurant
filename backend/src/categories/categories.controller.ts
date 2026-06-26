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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';

// จัดการหมวดหมู่ — staff ของร้าน (scope ตาม shopId, ต้องร้าน active)
// WAITER ดูได้ (ไว้คีย์ออเดอร์) แต่แก้ไขเป็นของ OWNER
@Controller('categories')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @Roles('OWNER', 'WAITER')
  list(@CurrentShop() shopId: number) {
    return this.categories.list(shopId);
  }

  @Post()
  @Roles('OWNER')
  create(@CurrentShop() shopId: number, @Body() dto: CreateCategoryDto) {
    return this.categories.create(shopId, dto.name);
  }

  @Patch(':id')
  @Roles('OWNER')
  rename(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.rename(shopId, id, dto.name);
  }

  @Delete(':id')
  @Roles('OWNER')
  remove(@CurrentShop() shopId: number, @Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(shopId, id);
  }
}
