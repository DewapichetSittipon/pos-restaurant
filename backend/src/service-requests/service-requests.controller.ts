import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Bill, Table } from '@prisma/client';
import { ServiceRequestsService } from './service-requests.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { CustomerTokenGuard } from '../auth/customer-token.guard';
import { CurrentBill } from '../auth/current-bill.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentShop } from '../auth/current-shop.decorator';

@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  // ลูกค้าเรียก (ใช้ qr_token) — shop มาจาก bill
  @Post()
  @UseGuards(CustomerTokenGuard)
  create(
    @CurrentBill() bill: Bill & { table: Table },
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.service.create(bill.shopId, bill.id, dto.type);
  }

  // พนักงานรับเรื่อง (หน้าโต๊ะ)
  @Patch(':id/ack')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'WAITER')
  ack(@CurrentShop() shopId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.acknowledge(shopId, id);
  }
}
