import { Controller, Get, UseGuards } from '@nestjs/common';
import { TablesService } from './tables.service';
import { CustomerTokenGuard } from '../auth/customer-token.guard';
import { CurrentBill } from '../auth/current-bill.decorator';
import type { Bill, Table } from '@prisma/client';

// มุมมองลูกค้า: ใช้ qr_token (header x-qr-token หรือ ?token=)
@Controller('customer')
@UseGuards(CustomerTokenGuard)
export class SessionController {
  constructor(private readonly tables: TablesService) {}

  @Get('session')
  session(@CurrentBill() bill: Bill & { table: Table }) {
    return this.tables.getSession(bill.id);
  }
}
