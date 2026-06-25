import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestWithBill } from './auth.types';

// ตรวจ qr_token: ต้องตรงกับ Bill ที่ status = pending (ดู ADR token / Bill.status)
// อ่าน token จาก header x-qr-token หรือ query ?token=
@Injectable()
export class CustomerTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithBill>();
    const header = req.headers['x-qr-token'];
    const token =
      (typeof header === 'string' ? header : undefined) ??
      (req.query?.token as string | undefined);

    if (!token) {
      throw new UnauthorizedException('ไม่พบ token ของโต๊ะ');
    }

    const bill = await this.prisma.bill.findFirst({
      where: { qrToken: token, status: 'pending' },
      include: { table: true },
    });
    if (!bill) {
      throw new UnauthorizedException('บิลปิดแล้วหรือ token ไม่ถูกต้อง');
    }

    req.bill = bill;
    return true;
  }
}
