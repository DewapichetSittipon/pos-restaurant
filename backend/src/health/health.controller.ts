import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    // ยืนยันว่าเชื่อม DB ได้ + นับข้อมูล seed
    const [tables, categories, menus, staff] = await Promise.all([
      this.prisma.table.count(),
      this.prisma.category.count(),
      this.prisma.menu.count(),
      this.prisma.staff.count(),
    ]);
    return {
      status: 'ok',
      db: 'connected',
      counts: { tables, categories, menus, staff },
    };
  }
}
