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
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveShopGuard } from '../auth/active-shop.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';

// การจองโต๊ะ — เจ้าของร้าน + พนักงานเสิร์ฟจัดการได้
@Controller('reservations')
@UseGuards(JwtAuthGuard, ActiveShopGuard, RolesGuard)
@Roles('OWNER', 'WAITER')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  list(@CurrentShop() shopId: number, @Query('date') date?: string) {
    return this.reservations.list(shopId, date);
  }

  @Post()
  create(@CurrentShop() shopId: number, @Body() dto: CreateReservationDto) {
    return this.reservations.create(shopId, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReservationStatusDto,
  ) {
    return this.reservations.updateStatus(shopId, id, dto.status);
  }

  @Delete(':id')
  remove(
    @CurrentShop() shopId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reservations.remove(shopId, id);
  }
}
