import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditActor {
  id: number;
  username: string;
}

// บันทึกการกระทำสำคัญ — ออกแบบให้ "ไม่มีวัน throw" (audit ล้มไม่ควรทำให้ action หลักพัง)
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private readonly prisma: PrismaService) {}

  async log(
    shopId: number,
    actor: AuditActor,
    action: string,
    detail?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          shopId,
          staffId: actor.id,
          staffName: actor.username,
          action,
          detail: detail ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(`audit log failed (${action}): ${String(err)}`);
    }
  }

  // รายการล่าสุดของร้าน (สำหรับเจ้าของร้านดู)
  list(shopId: number, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 300),
    });
  }
}
