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
import { CurrentShop } from '../auth/current-shop.decorator';

// จัดการหมวดหมู่ — staff ของร้าน (scope ตาม shopId, ต้องร้าน active)
@Controller('categories')
@UseGuards(JwtAuthGuard, ActiveShopGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@CurrentShop() shopId: number) {
    return this.categories.list(shopId);
  }

  @Post()
  create(@CurrentShop() shopId: number, @Body() dto: CreateCategoryDto) {
    return this.categories.create(shopId, dto.name);
  }

  @Patch(':id')
  rename(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.rename(shopId, id, dto.name);
  }

  @Delete(':id')
  remove(@CurrentShop() shopId: number, @Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(shopId, id);
  }
}
